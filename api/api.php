<?php
require_once 'config.php';
header('Content-Type: application/json');

// Enable simple error reporting for development (disable in prod)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Only allow specific origins in production, open for now
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$action = $_GET['action'] ?? '';

try {
    $db = getDB();

    switch ($action) {
        case 'get_books':
            $stmt = $db->query("SELECT * FROM wrangler_books ORDER BY added_at DESC");
            $books = $stmt->fetchAll();
            echo json_encode(['success' => true, 'data' => $books]);
            break;
            
        case 'migrate':
            try {
                $db->exec("ALTER TABLE wrangler_books ADD COLUMN description TEXT");
                echo json_encode(['success' => true, 'message' => 'Added description column.']);
            } catch (Exception $e) {
                echo json_encode(['success' => false, 'error' => $e->getMessage()]);
            }
            break;
            
        case 'add_book':
            $input = json_decode(file_get_contents('php://input'), true);
            $title = $input['title'] ?? '';
            $author = $input['author'] ?? '';
            $cover_url = $input['cover_url'] ?? '';
            $google_books_id = $input['google_books_id'] ?? null;
            $community_rating = $input['community_rating'] ?? 0;
            $status = $input['status'] ?? 'to-read';
            $description = $input['description'] ?? '';
            
            if (empty($title)) {
                echo json_encode(['success' => false, 'error' => 'Title is required']);
                break;
            }
            
            $stmt = $db->prepare("INSERT INTO wrangler_books 
                (title, author, cover_url, google_books_id, community_rating, status, description) 
                VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$title, $author, $cover_url, $google_books_id, $community_rating, $status, $description]);
            
            echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
            break;
            
        case 'update_book':
            $input = json_decode(file_get_contents('php://input'), true);
            $id = $input['id'] ?? 0;
            $status = $input['status'] ?? null;
            $user_rating = $input['user_rating'] ?? null;
            
            if (!$id) {
                echo json_encode(['success' => false, 'error' => 'ID is required']);
                break;
            }
            
            $updates = [];
            $params = [];
            if ($status !== null) {
                $updates[] = "status = ?";
                $params[] = $status;
            }
            if ($user_rating !== null) {
                $updates[] = "user_rating = ?";
                $params[] = $user_rating;
            }
            
            if (empty($updates)) {
                echo json_encode(['success' => true, 'message' => 'No changes requested']);
                break;
            }
            
            $params[] = $id;
            $sql = "UPDATE wrangler_books SET " . implode(", ", $updates) . " WHERE id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            
            echo json_encode(['success' => true]);
            break;

        case 'delete_book':
            $input = json_decode(file_get_contents('php://input'), true);
            $id = $input['id'] ?? 0;
            if (!$id) {
                echo json_encode(['success' => false, 'error' => 'ID is required']);
                break;
            }
            $stmt = $db->prepare("DELETE FROM wrangler_books WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
            break;
            
        default:
            echo json_encode(['success' => false, 'error' => 'Invalid action']);
            break;
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
