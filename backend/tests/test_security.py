import unittest
from datetime import timedelta
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


class SecurityUtilsTests(unittest.TestCase):
    def test_password_hashing(self):
        password = "super-secret-penguin"
        hashed = hash_password(password)

        self.assertNotEqual(password, hashed)
        self.assertTrue(verify_password(password, hashed))
        self.assertFalse(verify_password("wrong-password", hashed))

    def test_jwt_token_flow(self):
        subject = "test-user-id"
        token = create_access_token(
            subject=subject, expires_delta=timedelta(minutes=10)
        )

        decoded = decode_access_token(token)

        self.assertEqual(decoded["sub"], subject)
        self.assertIn("exp", decoded)

    def test_token_expiration(self):
        # test token with negative expiry; raises an error
        token = create_access_token(subject="user", expires_delta=timedelta(minutes=-1))

        import jwt

        with self.assertRaises(jwt.ExpiredSignatureError):
            decode_access_token(token)
