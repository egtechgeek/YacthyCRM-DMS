<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Two-Factor Authentication Code</title>
</head>
<body>
    <h2>Your Two-Factor Authentication Code</h2>
    <p>Hello {{ $user->name }},</p>
    <p>Your two-factor authentication code is:</p>
    <h1 style="font-size: 32px; letter-spacing: 5px; text-align: center;">{{ $code }}</h1>
    <p>This code will expire in 10 minutes.</p>
    <p>If you didn't request this code, please ignore this email.</p>
</body>
</html>

