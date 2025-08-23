Repo cleanup summary

To keep the app stable, only redundant test/one-off scripts will be removed. Core functions and APIs are untouched.

Files to remove:
- test_supabase_connection.py (ad-hoc connectivity test)
- test_cookie_integration.py (one-off cookie check)
- test_youtube_fixes.py (ad-hoc yt-dlp test)
- test_books.py (legacy local test)

New docs:
- docs/FILES_OVERVIEW.md: Explains what each .py does.

No functional code paths changed; imports and runtime files remain intact.


