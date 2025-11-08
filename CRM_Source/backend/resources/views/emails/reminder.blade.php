<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Maintenance Reminder</title>
</head>
<body>
    <h2>Maintenance Reminder</h2>
    <p>Dear {{ $customer->name }},</p>
    
    {!! $body !!}
    
    <p><strong>Task:</strong> {{ $maintenanceSchedule->task_name }}</p>
    <p><strong>Next Due Date:</strong> {{ $maintenanceSchedule->next_due_date->format('F j, Y') }}</p>
    
    @if($maintenanceSchedule->yacht)
    <p><strong>Yacht:</strong> {{ $maintenanceSchedule->yacht->name }}</p>
    @endif
    
    <p>Please contact us to schedule this maintenance.</p>
</body>
</html>

