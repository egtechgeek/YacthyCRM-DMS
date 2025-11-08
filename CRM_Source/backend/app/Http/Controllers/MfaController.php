<?php

namespace App\Http\Controllers;

use App\Models\MfaSetting;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;
use PragmaRX\Google2FA\Google2FA;

class MfaController extends Controller
{
    protected $google2fa;

    public function __construct()
    {
        $this->google2fa = new Google2FA();
    }

    /**
     * Generate TOTP secret and QR code for setup
     */
    public function setupTotp(Request $request)
    {
        $user = $request->user();

        $secret = $this->google2fa->generateSecretKey();
        
        $qrCodeUrl = $this->google2fa->getQRCodeUrl(
            config('app.name'),
            $user->email,
            $secret
        );

        // Store secret temporarily (encrypted) - user must verify before enabling
        $mfaSetting = MfaSetting::updateOrCreate(
            ['user_id' => $user->id],
            ['totp_secret' => encrypt($secret)]
        );

        return response()->json([
            'secret' => $secret,
            'qr_code_url' => $qrCodeUrl,
            'message' => 'TOTP secret generated. Please verify to enable.'
        ], 200);
    }

    /**
     * Verify TOTP code and enable MFA
     */
    public function verifyTotp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'code' => ['required', 'string', 'size:6'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = $request->user();
        $mfaSetting = MfaSetting::where('user_id', $user->id)->first();

        if (!$mfaSetting || !$mfaSetting->totp_secret) {
            return response()->json([
                'message' => 'TOTP not set up. Please set up first.'
            ], 400);
        }

        $secret = decrypt($mfaSetting->totp_secret);
        $valid = $this->google2fa->verifyKey($secret, $request->code);

        if (!$valid) {
            return response()->json([
                'message' => 'Invalid TOTP code'
            ], 422);
        }

        // Generate recovery codes
        $recoveryCodes = $this->generateRecoveryCodes();

        // Enable MFA
        $mfaSetting->update([
            'mfa_enabled' => true,
            'mfa_method' => 'totp',
            'recovery_codes' => $recoveryCodes,
        ]);

        return response()->json([
            'message' => 'MFA enabled successfully',
            'recovery_codes' => $recoveryCodes,
            'warning' => 'Save these recovery codes in a safe place. You will need them if you lose access to your authenticator app.'
        ], 200);
    }

    /**
     * Verify TOTP during login
     */
    public function verifyLoginTotp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'email'],
            'code' => ['required', 'string', 'size:6'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'message' => 'User not found'
            ], 404);
        }

        $mfaSetting = $user->mfaSetting;

        if (!$mfaSetting || !$mfaSetting->mfa_enabled || $mfaSetting->mfa_method !== 'totp') {
            return response()->json([
                'message' => 'TOTP MFA not enabled for this user'
            ], 400);
        }

        $secret = decrypt($mfaSetting->totp_secret);
        $valid = $this->google2fa->verifyKey($secret, $request->code);

        if (!$valid) {
            return response()->json([
                'message' => 'Invalid TOTP code'
            ], 422);
        }

        // Generate token for user
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'MFA verification successful',
            'user' => $user,
            'token' => $token
        ], 200);
    }

    /**
     * Send email-based 2FA code
     */
    public function sendEmailCode(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'email'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'message' => 'User not found'
            ], 404);
        }

        // Generate 6-digit code
        $code = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        
        // Store code in session or cache (expires in 10 minutes)
        cache()->put("mfa_email_code_{$user->id}", $code, now()->addMinutes(10));

        // Send email with code
        Mail::send('emails.mfa-code', ['code' => $code, 'user' => $user], function ($message) use ($user) {
            $message->to($user->email)
                    ->subject('Your Two-Factor Authentication Code');
        });

        return response()->json([
            'message' => '2FA code sent to your email'
        ], 200);
    }

    /**
     * Verify email-based 2FA code
     */
    public function verifyEmailCode(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'email'],
            'code' => ['required', 'string', 'size:6'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'message' => 'User not found'
            ], 404);
        }

        $storedCode = cache()->get("mfa_email_code_{$user->id}");

        if (!$storedCode || $storedCode !== $request->code) {
            return response()->json([
                'message' => 'Invalid or expired code'
            ], 422);
        }

        // Clear the code
        cache()->forget("mfa_email_code_{$user->id}");

        // Generate token for user
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'MFA verification successful',
            'user' => $user,
            'token' => $token
        ], 200);
    }

    /**
     * Enable email-based 2FA
     */
    public function enableEmail2fa(Request $request)
    {
        $user = $request->user();

        $mfaSetting = MfaSetting::updateOrCreate(
            ['user_id' => $user->id],
            [
                'email_2fa_enabled' => true,
                'mfa_enabled' => true,
                'mfa_method' => 'email',
            ]
        );

        return response()->json([
            'message' => 'Email-based 2FA enabled successfully'
        ], 200);
    }

    /**
     * Disable MFA
     */
    public function disableMfa(Request $request)
    {
        $user = $request->user();

        $mfaSetting = MfaSetting::where('user_id', $user->id)->first();

        if ($mfaSetting) {
            $mfaSetting->update([
                'mfa_enabled' => false,
                'email_2fa_enabled' => false,
                'totp_secret' => null,
                'mfa_method' => null,
            ]);
        }

        return response()->json([
            'message' => 'MFA disabled successfully'
        ], 200);
    }

    /**
     * Get MFA status
     */
    public function getMfaStatus(Request $request)
    {
        $user = $request->user();
        $mfaSetting = $user->mfaSetting;

        return response()->json([
            'mfa_enabled' => $mfaSetting && $mfaSetting->mfa_enabled,
            'mfa_method' => $mfaSetting ? $mfaSetting->mfa_method : null,
        ], 200);
    }

    /**
     * Verify recovery code
     */
    public function verifyRecoveryCode(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'email'],
            'recovery_code' => ['required', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'message' => 'User not found'
            ], 404);
        }

        $mfaSetting = $user->mfaSetting;

        if (!$mfaSetting || !$mfaSetting->recovery_codes) {
            return response()->json([
                'message' => 'No recovery codes found'
            ], 400);
        }

        $recoveryCodes = $mfaSetting->recovery_codes;

        if (!in_array($request->recovery_code, $recoveryCodes)) {
            return response()->json([
                'message' => 'Invalid recovery code'
            ], 422);
        }

        // Remove used recovery code
        $recoveryCodes = array_values(array_diff($recoveryCodes, [$request->recovery_code]));
        $mfaSetting->update(['recovery_codes' => $recoveryCodes]);

        // Generate token for user
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Recovery code verified successfully',
            'user' => $user,
            'token' => $token
        ], 200);
    }

    /**
     * Generate new recovery codes
     */
    public function regenerateRecoveryCodes(Request $request)
    {
        $user = $request->user();
        $mfaSetting = $user->mfaSetting;

        if (!$mfaSetting || !$mfaSetting->mfa_enabled) {
            return response()->json([
                'message' => 'MFA is not enabled'
            ], 400);
        }

        $recoveryCodes = $this->generateRecoveryCodes();
        $mfaSetting->update(['recovery_codes' => $recoveryCodes]);

        return response()->json([
            'message' => 'Recovery codes regenerated',
            'recovery_codes' => $recoveryCodes,
            'warning' => 'Save these recovery codes in a safe place. Old codes are no longer valid.'
        ], 200);
    }

    /**
     * Generate recovery codes
     */
    private function generateRecoveryCodes(): array
    {
        $codes = [];
        for ($i = 0; $i < 10; $i++) {
            $codes[] = strtoupper(substr(md5(uniqid(rand(), true)), 0, 8));
        }
        return $codes;
    }
}

