<?php
require_once 'api/config.php';
try {
    $db = getDB();
    $db->exec("ALTER TABLE wrangler_books ADD COLUMN description TEXT");
    echo "Added description column.";
} catch (Exception $e) {
    echo "Error or already exists: " . $e->getMessage();
}
