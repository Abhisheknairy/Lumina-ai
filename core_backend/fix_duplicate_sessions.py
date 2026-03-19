"""
One-time script to remove duplicate ChatSession rows.
Run with: python manage.py shell < fix_duplicate_sessions.py
"""
from django.db.models import Count
from chatbot.models import ChatSession

dupes = (
    ChatSession.objects
    .values('kb_id', 'user_id')
    .annotate(cnt=Count('id'))
    .filter(cnt__gt=1)
)

total_deleted = 0

for d in dupes:
    qs      = ChatSession.objects.filter(kb_id=d['kb_id'], user_id=d['user_id']).order_by('-id')
    keep_id = qs.first().id
    deleted, _ = ChatSession.objects.filter(
        kb_id=d['kb_id'], user_id=d['user_id']
    ).exclude(id=keep_id).delete()
    total_deleted += deleted
    print(f"  kb_id={d['kb_id']} user_id={d['user_id']}: kept id={keep_id}, deleted {deleted} duplicates")

print(f"\nDone. Total deleted: {total_deleted}")
