# Phase 7: End-to-End Reliability Testing

## Backend
- [ ] GET /health
- [ ] POST /api/messages - "Submit the NDC assignment before 10th September"
- [ ] POST /api/messages - Duplicate task prevention
- [ ] POST /api/messages - Casual message "Hey bro, what are you doing?"
- [ ] POST /api/messages - WhatsApp notification summary "4 new messages"
- [ ] POST /api/messages - Important non-task "Flight exam @10 tomorrow in ALHC 304"

## Dashboard 
- [ ] Ensure `npm run build` succeeds
- [ ] Validate task loading logic
- [ ] Validate filters and sorting
- [ ] Validate complete / delete action state handling

## Deployment
- [ ] Verify Render backend `https://whatapptashmanager-api.onrender.com/health`
- [ ] Verify Groq models are being utilized.
