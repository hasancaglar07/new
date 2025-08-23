from youtube_search_fallback import search_youtube_videos, search_channel_videos

# Kanal adlarını öğren
channel_mapping = {
    'UCfYG6Ij2vIJXXplpottv02Q': 'Yediulya',
    'UCvhlPtV-1MgZBQPmGjomhsA': 'Kalemdar Alemdar',
    'UC9Jt0jM08o7aXSHz0Kni7Uw': 'Didar Akademi',
    'UC0FN4XBgk2Isvv1QmrbFn8w': 'Kutbu Cihan'
}

# Genel arama test
print("=== Genel Arama ===")
videos = search_youtube_videos('rabıta', 10)
print(f'Bulunan: {len(videos)}')
for i, v in enumerate(videos):
    channel_name = v.get('channel', 'N/A')
    print(f'{i+1}. {v.get("title", "N/A")}')
    print(f'   Kanal: {channel_name}')
    
    # Bu kanallardan biri mi kontrol et
    for channel_id, expected_name in channel_mapping.items():
        if expected_name.lower() in channel_name.lower():
            print(f'   *** BU KANAL HEDEF KANALLARIMIZDAN: {expected_name} ***')
    print()

print("\n=== Kanal Spesifik Arama Test ===")
for channel_id, name in channel_mapping.items():
    videos = search_channel_videos(channel_id, 'rabıta', 2)
    print(f'{name} ({channel_id}): {len(videos)} video')