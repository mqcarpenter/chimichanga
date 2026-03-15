<?php
require_once 'config.php';

try {
    $db = getDB();
    
    // Create wrangler_books table
    $query = "
        CREATE TABLE IF NOT EXISTS wrangler_books (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            author VARCHAR(255) NOT NULL,
            cover_url VARCHAR(500),
            google_books_id VARCHAR(50) UNIQUE,
            goodreads_id VARCHAR(50) UNIQUE,
            status ENUM('read', 'currently-reading', 'to-read') DEFAULT 'to-read',
            description TEXT,
            user_rating TINYINT DEFAULT 0,
            community_rating DECIMAL(3,2) DEFAULT 0.00,
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    
    $db->exec($query);
    echo "Successfully created wrangler_books table.\n";

    // Attempt to fetch RSS data
    $rss_url = "https://www.goodreads.com/review/list_rss/5125594";
    
    $rss_content = @file_get_contents($rss_url);
    if ($rss_content) {
        $xml = simplexml_load_string($rss_content, 'SimpleXMLElement', LIBXML_NOCDATA);
        if ($xml && isset($xml->channel->item)) {
            $stmt = $db->prepare("INSERT IGNORE INTO wrangler_books 
                (title, author, cover_url, goodreads_id, status, user_rating, added_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?)");
            
            $count = 0;
            foreach ($xml->channel->item as $item) {
                // Determine title
                $title = (string)$item->title;
                if (empty($title)) continue;
                
                $author = (string)$item->author_name;
                
                // Get image
                $cover_url = (string)$item->book_large_image_url;
                if (empty($cover_url)) {
                    $cover_url = (string)$item->book_image_url;
                }
                
                $goodreads_id = (string)$item->book_id;
                $user_rating = (int)$item->user_rating;
                $shelves = (string)$item->user_shelves;
                
                $status = 'to-read';
                if (strpos($shelves, 'read') !== false && strpos($shelves, 'currently') === false) {
                    $status = 'read';
                } elseif (strpos($shelves, 'currently-reading') !== false) {
                    $status = 'currently-reading';
                }
                
                // Ensure valid timestamp or use current fallback
                $pubDateStr = (string)$item->user_date_added;
                $pubDate = $pubDateStr ? date('Y-m-d H:i:s', strtotime($pubDateStr)) : date('Y-m-d H:i:s');

                $stmt->execute([$title, $author, $cover_url, $goodreads_id, $status, $user_rating, $pubDate]);
                if ($stmt->rowCount() > 0) {
                    $count++;
                }
            }
            echo "Successfully imported $count books from Goodreads RSS.\n";
        } else {
            echo "Failed to parse XML or no items found.\n";
        }
    } else {
        echo "Failed to fetch Goodreads RSS from $rss_url.\n";
    }
} catch (PDOException $e) {
    echo "Database Error: " . $e->getMessage() . "\n";
}
