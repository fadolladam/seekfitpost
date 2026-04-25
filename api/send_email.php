<?php
// PHP Mailer for local Laragon testing
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);

if (!$data['to'] || !$data['subject'] || !$data['body']) {
    echo json_encode(['success' => false, 'message' => 'Missing fields']);
    exit;
}

$to = $data['to'];
$subject = $data['subject'];
$body = $data['body'];
$logo_url = 'https://i.ibb.co/TMhCH7ML/seekfitjob-logo.png';

$smtp_user = 'hr@seekfitjob.com';
$smtp_pass = 'hZE4FodxE!m!i!kCF9Me';
$smtp_host = 'smtp.zoho.com';
$smtp_port = 465;

// Professional HTML Signature
$htmlSignature = '
<br><br>
<table cellpadding="0" cellspacing="0" style="font-family: sans-serif; color: #0f172a; border-top: 1px solid #f1f5f9;">
    <tr>
        <td style="padding-top: 20px; padding-right: 24px; border-right: 2px solid #4f46e5; vertical-align: top;">
            <div style="width: 80px; height: 80px; border-radius: 12px; overflow: hidden;">
                <img src="'.$logo_url.'" alt="Logo" style="width: 80px; height: 80px; display: block; object-fit: contain;">
            </div>
        </td>
        <td style="padding-top: 20px; padding-left: 24px; vertical-align: top;">
            <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 2px;">SeekFitJob HR Department</div>
            <div style="font-size: 13px; color: #64748b; font-weight: 500; margin-bottom: 12px;">Human Resources</div>
            <div style="font-size: 12px; font-weight: 600; color: #4f46e5;"><a href="https://seekfitjob.com">seekfitjob.com</a></div>
            <div style="font-size: 12px; font-weight: 600; color: #4f46e5;">Tel : 085 558 404</div>
        </td>
    </tr>
</table>';

$fullHtml = '<div style="font-family: sans-serif; font-size: 14px; line-height: 1.6; color: #334155;">'.nl2br($body).'</div>' . $htmlSignature;

// Simple SMTP send function (similar to test_mail.php)
function send_smtp($to, $subject, $message, $user, $pass, $host, $port) {
    $socket = fsockopen("ssl://$host", $port, $errno, $errstr, 30);
    if (!$socket) return false;

    function get_res($socket) {
        $res = "";
        while ($str = fgets($socket, 515)) {
            $res .= $str;
            if (substr($str, 3, 1) == " ") break;
        }
        return $res;
    }

    get_res($socket);
    fwrite($socket, "EHLO localhost\r\n"); get_res($socket);
    fwrite($socket, "AUTH LOGIN\r\n"); get_res($socket);
    fwrite($socket, base64_encode($user) . "\r\n"); get_res($socket);
    fwrite($socket, base64_encode($pass) . "\r\n"); get_res($socket);
    fwrite($socket, "MAIL FROM: <$user>\r\n"); get_res($socket);
    fwrite($socket, "RCPT TO: <$to>\r\n"); get_res($socket);
    fwrite($socket, "DATA\r\n"); get_res($socket);
    
    $headers = "To: $to\r\nFrom: SeekFit HR <$user>\r\nSubject: $subject\r\nMIME-Version: 1.0\r\nContent-type: text/html; charset=UTF-8\r\n\r\n";
    fwrite($socket, $headers . $message . "\r\n.\r\n");
    $res = get_res($socket);
    fwrite($socket, "QUIT\r\n");
    fclose($socket);
    return substr($res, 0, 3) == '250';
}

if (send_smtp($to, $subject, $fullHtml, $smtp_user, $smtp_pass, $smtp_host, $smtp_port)) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'message' => 'SMTP send failed']);
}
?>
