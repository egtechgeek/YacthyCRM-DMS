<?php
// Quick test to see what's in the SQL file
session_start();

if (isset($_FILES['test_file'])) {
    $content = file_get_contents($_FILES['test_file']['tmp_name']);
    
    echo "<h3>File Info:</h3>";
    echo "Size: " . strlen($content) . " bytes<br>";
    echo "First 500 chars:<br>";
    echo "<pre>" . htmlspecialchars(substr($content, 0, 500)) . "</pre>";
    
    echo "<h3>Tables Found:</h3>";
    preg_match_all("/INSERT INTO [`'\"]?(\w+)[`'\"]?/i", $content, $matches);
    $tables = array_unique($matches[1]);
    echo "<pre>";
    print_r($tables);
    echo "</pre>";
    
    echo "<h3>Sample INSERT for ip_clients:</h3>";
    if (preg_match("/INSERT INTO [`'\"]?ip_clients[`'\"]?.*?VALUES.*?;/is", $content, $match)) {
        echo "<pre>" . htmlspecialchars(substr($match[0], 0, 500)) . "...</pre>";
    } else {
        echo "No ip_clients INSERT found";
    }
    exit;
}
?>
<!DOCTYPE html>
<html>
<head><title>SQL Parse Test</title></head>
<body>
<h2>Test SQL Dump Parser</h2>
<form method="POST" enctype="multipart/form-data">
    <input type="file" name="test_file" accept=".sql">
    <button type="submit">Test Parse</button>
</form>
</body>
</html>

