<?php
session_start();
session_destroy();
header("Location: ../login_create_forgot_account/login.php");
exit();
?>