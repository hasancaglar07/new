# utils/b2_client.py
# Minimal Backblaze B2 helper: authorize, find bucket, upload JSON, list JSON by prefix

from __future__ import annotations
import base64
import hashlib
import json
import requests
from typing import Optional, Dict, Any, List

class B2Client:
    def __init__(self, application_key_id: str, application_key: str):
        self.application_key_id = application_key_id
        self.application_key = application_key
        self.api_url: Optional[str] = None
        self.authorization_token: Optional[str] = None
        self.download_url: Optional[str] = None
        self.account_id: Optional[str] = None

    def authorize(self) -> None:
        auth_str = f"{self.application_key_id}:{self.application_key}".encode()
        headers = {"Authorization": "Basic " + base64.b64encode(auth_str).decode()}
        resp = requests.get("https://api.backblazeb2.com/b2api/v3/b2_authorize_account", headers=headers, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        self.api_url = data["apiUrl"]
        self.authorization_token = data["authorizationToken"]
        self.download_url = data.get("downloadUrl")
        self.account_id = data.get("accountId")

    def _ensure_auth(self) -> None:
        if not self.authorization_token:
            self.authorize()

    def get_bucket_id(self, bucket_name: str) -> str:
        self._ensure_auth()
        url = f"{self.api_url}/b2api/v3/b2_list_buckets"
        payload = {"accountId": self.account_id, "bucketName": bucket_name}
        headers = {"Authorization": self.authorization_token}
        resp = requests.post(url, headers=headers, json=payload, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        buckets = data.get("buckets", [])
        if not buckets:
            raise RuntimeError(f"Bucket not found: {bucket_name}")
        return buckets[0]["bucketId"]

    def get_upload_url(self, bucket_id: str) -> Dict[str, str]:
        self._ensure_auth()
        url = f"{self.api_url}/b2api/v3/b2_get_upload_url"
        headers = {"Authorization": self.authorization_token}
        resp = requests.post(url, headers=headers, json={"bucketId": bucket_id}, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        return {"uploadUrl": data["uploadUrl"], "authorizationToken": data["authorizationToken"]}

    def upload_json(self, bucket_name: str, key: str, obj: Dict[str, Any]) -> str:
        self._ensure_auth()
        bucket_id = self.get_bucket_id(bucket_name)
        up = self.get_upload_url(bucket_id)
        content = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        sha1 = hashlib.sha1(content).hexdigest()
        headers = {
            "Authorization": up["authorizationToken"],
            "X-Bz-File-Name": key,
            "Content-Type": "application/json; charset=utf-8",
            "X-Bz-Content-Sha1": sha1,
        }
        resp = requests.post(up["uploadUrl"], headers=headers, data=content, timeout=30)
        resp.raise_for_status()
        return key

    def upload_file(self, bucket_name: str, local_file_path: str, remote_file_name: str) -> bool:
        """Upload a file to B2"""
        try:
            self._ensure_auth()
            bucket_id = self.get_bucket_id(bucket_name)
            up = self.get_upload_url(bucket_id)
            
            # Read file and calculate SHA1
            with open(local_file_path, 'rb') as f:
                content = f.read()
            
            sha1 = hashlib.sha1(content).hexdigest()
            
            headers = {
                "Authorization": up["authorizationToken"],
                "X-Bz-File-Name": remote_file_name,
                "Content-Type": "application/octet-stream",
                "X-Bz-Content-Sha1": sha1,
            }
            
            resp = requests.post(up["uploadUrl"], headers=headers, data=content, timeout=60)
            resp.raise_for_status()
            return True
            
        except Exception as e:
            print(f"Upload error: {e}")
            return False

    def list_json_keys(self, bucket_name: str, prefix: str, max_count: int = 100) -> List[str]:
        self._ensure_auth()
        bucket_id = self.get_bucket_id(bucket_name)
        url = f"{self.api_url}/b2api/v3/b2_list_file_names"
        headers = {"Authorization": self.authorization_token}
        payload = {"bucketId": bucket_id, "prefix": prefix, "maxFileCount": max_count}
        resp = requests.post(url, headers=headers, json=payload, timeout=20)
        resp.raise_for_status()
        data = resp.json()
        return [f["fileName"] for f in data.get("files", []) if f.get("fileName", "").endswith(".json")]

    def download_json(self, bucket_name: str, key: str) -> Optional[Dict[str, Any]]:
        self._ensure_auth()
        if not self.download_url:
            raise RuntimeError("Missing download_url after authorize")
        # Public bucket assumed; if private, signed URLs would be needed.
        url = f"{self.download_url}/file/{bucket_name}/{key}"
        resp = requests.get(url, timeout=20)
        if resp.status_code != 200:
            return None
        try:
            return resp.json()
        except Exception:
            return None
