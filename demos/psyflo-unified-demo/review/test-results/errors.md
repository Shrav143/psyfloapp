# errors · PASS

Run 2026-11-11T18-43-29Z · 12303 ms · instance 0 · exit 0

| Result | Test | Note |
|---|---|---|
| PASS | /api/state answers 500 on load: an alert says the server cannot be reached, with Retry; never "Nothing needs you right now" or an endless "Loading" |  |
| PASS | the server does not answer at all (the request is dropped): the same error state |  |
| PASS | the session ended (401): "Your session ended" with Sign in again, not an empty screen; Sign in again opens the sign-in screen |  |
| PASS | a failure after the screen loaded keeps the last good data and says so; when the server returns the screen is current again |  |
| PASS | a signed-out visitor is not shown an error: the sign-in screen loads from the public roster |  |
