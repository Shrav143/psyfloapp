# bridge-contract · PASS

Run 2026-11-11T15-10-12Z · 332 ms · instance 1 · exit 0

| Result | Test | Note |
|---|---|---|
| PASS | consumer list: #consumer-list rows carry data-consumer and data-program; .top .r and .side .lnav .b exist |  |
| PASS | consumer header: .hdr .nm, #consumer-name, "Harvest #", Program:, .units |  |
| PASS | session form: #lauris-form data-form/session/consumer, #session-form-title, label[for] boxes, Save/Process buttons |  |
| PASS | PRG redirects and the flash: ?processed= ?saved= ?signed= ?rejected= ?created= with #lauris-flash[data-event/session/form/consumer] |  |
| PASS | portal pages: #portal-form and #portal-confirmation[data-ref/request/kind] |  |
| PASS | the bridge source: message shapes, origin checks, no clicks, no background fetch to Lauris, same copy in extension/ |  |
| PASS | what the bridge reports is accepted from the Lauris origin only with a JSON body (the bridge posts exactly this) |  |
