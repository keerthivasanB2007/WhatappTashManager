# Dashboard UI Architecture & Contract

## Component Separation
The monolithic `App.jsx` layer has been fully abstracted into logical components supporting multi-tenant authenticated queries securely handled via `axiosClient` integrations bridging global TanStack caches into isolated React Context scopes. 

## Sidebar Sender Contract
The Sidebar acts as the primary grouping construct representing the normalized WhatsApp groups and contact entities. 

The application architecture establishes the following explicit guarantees dictating safe cross-domain normalization resolving identical duplicates reliably:

1. **DISPLAY SENDER (Presentation)**
   - The original raw sender identity exactly as received by the backend. 
   - *Note: The '(N messages)' suffix is observed in notification-derived sender values in the current application flow. Its exact origin (WhatsApp, Android notification bundling, or another notification-layer behavior) has not been independently verified with a raw live-device payload.*
   - Preserves capitalization natively and is utilized strictly for human-readable DOM elements.
   - Example 1: `Gowtham.A`
   - Example 2: `3rd year Kurinji and Marutham (16 messages)`
   
2. **GROUPING KEY (`senderKey`)**
   - The normalized sender identity used mathematically across all database locks, deduplication tokens, and React Sidebar Grouping algorithms.
   - Derived by: Trimming, stripping `(N messages)` signatures, and lowering casing (`toLowerCase`).
   - `senderKey` is NEVER displayed physically to end users natively.
   - **Example 1:**
     - Display: `"Gowtham.A"` 
     - Key: `"gowtham.a"`
   - **Example 2:**
     - Display: `"GOWTHAM.A (3 messages)"`
     - Key: `"gowtham.a"`
     
Both examples output seamlessly into **ONE Sidebar Group** mapping natively as `"gowtham.a"`. The display value generated physically inside the layout borrows the earliest known original casing variant ("Gowtham.A").

## Query String API Filtering (Phase 5 Prep)
Future remote filtering algorithms implemented externally must explicitly abide by the Identity mapping contract leveraging keys directly:
`?sender=gowtham.a`
Logically fetching and filtering models universally conforming to: 
`WHERE senderKey = "gowtham.a"`
