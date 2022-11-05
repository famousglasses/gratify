<?php

namespace Gratify;

/**
 * Utility for encryption and other security algorithms.
 */
class Keyring {
	/**
	 * Encrypt text.
	 *
	 * @param string $text
	 * @return string
	 */
	public function encrypt(string $text): string {
		return @openssl_encrypt($text, $_ENV['ENC_CIPHER'], $_ENV['ENC_KEY']);
	}

	/**
	 * Decrypt text.
	 *
	 * @param string $text
	 * @return string
	 */
	public function decrypt(string $text): string {
		return @openssl_decrypt($text, $_ENV['ENC_CIPHER'], $_ENV['ENC_KEY']);
	}

	/**
	 * Generate a new nonce.
	 *
	 * @param int $length
	 * @return string
	 */
	public function nonce(int $length = 16): string {
		return substr(str_shuffle(str_repeat($x = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', ceil($length / strlen($x)))), 1, $length);
	}
}
?>
