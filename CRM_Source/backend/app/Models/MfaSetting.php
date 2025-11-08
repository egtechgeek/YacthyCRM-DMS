<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MfaSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'totp_secret',
        'email_2fa_enabled',
        'recovery_codes',
        'mfa_enabled',
        'mfa_method',
    ];

    protected $casts = [
        'recovery_codes' => 'array',
        'email_2fa_enabled' => 'boolean',
        'mfa_enabled' => 'boolean',
    ];

    protected $hidden = [
        'totp_secret',
        'recovery_codes',
    ];

    /**
     * Relationship with User
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}

