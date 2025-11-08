<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome to Captain Ellenbogen Yacht Management CRM</title>
</head>
<body>
    <h2>Welcome to Captain Ellenbogen Yacht Management CRM</h2>
    <p>Dear {{ $customer->name }},</p>
    
    {!! $body !!}
    
    <p><strong>Your Login Credentials:</strong></p>
    <p>Email: {{ $customer->email }}</p>
    <p>Password: {{ $password }}</p>
    
    <p><a href="{{ config('app.frontend_url', 'http://localhost:3000') }}/login">Login to your account</a></p>
    
    <p>Please change your password after logging in.</p>
</body>
</html>

