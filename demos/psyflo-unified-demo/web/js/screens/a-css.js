// Shared CSS for the case-style screens of E2 (Authorization, Referral). Classes use the a- prefix; tokens and the UI kit do the rest.
export const A_CSS = `.a-main{max-width:1100px;margin:0 auto;padding:var(--sp-5) var(--gutter) 64px}
.a-case{display:flex;flex-direction:column;gap:var(--sp-4)}
.a-case a:not(.ui-btn):not(.ui-qt__link){color:var(--teal-700)}
.a-case a:not(.ui-btn):hover{text-decoration:underline}
.a-crumb{display:flex;gap:8px;align-items:center;font-size:var(--fs-13);color:var(--muted-700)}
.a-crumb a{font-weight:600;text-decoration:none}
.a-h1{margin:0;font-size:var(--fs-28);line-height:var(--lh-28);font-weight:600;letter-spacing:-.01em}
.a-h3{margin:var(--sp-4) 0 var(--sp-2);font-size:var(--fs-13);line-height:var(--lh-13);font-weight:600;color:var(--muted-700);text-transform:none;letter-spacing:.02em}
.a-id{font-weight:500;color:var(--muted-700);font-size:var(--fs-16);white-space:nowrap}
.a-sub{color:var(--muted-700);font-size:var(--fs-12);line-height:var(--lh-12)}
.a-chead{display:flex;flex-wrap:wrap;gap:var(--sp-3) var(--sp-5);align-items:flex-start}
.a-chead__main{flex:1 1 360px;min-width:0}
.a-chead__meta{display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:6px;color:var(--muted-700);font-size:var(--fs-13)}
.a-chead__r{display:flex;flex-wrap:wrap;gap:var(--sp-2) var(--sp-3);align-items:center;justify-content:flex-end}
.a-owner{display:inline-flex;gap:6px;align-items:baseline;font-size:var(--fs-13);flex-wrap:wrap}
.a-owner__l{color:var(--muted-700)}
.a-card{background:var(--surface-0);border:1px solid var(--line-200);border-radius:var(--r-3)}
.a-next{padding:var(--sp-4) var(--sp-5) var(--sp-5)}
.a-next__h{display:flex;align-items:center;gap:var(--sp-2);margin-bottom:var(--sp-3)}
.a-next__h h2{margin:0;font-size:var(--fs-18);line-height:var(--lh-18);font-weight:600}
.a-flow{display:grid;grid-template-columns:repeat(var(--cols,4),minmax(0,1fr));gap:var(--sp-3);list-style:none;margin:0 0 var(--sp-4);padding:0}
.a-flow__i{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border:1px solid var(--line-200);border-radius:var(--r-2);background:var(--paper-50);min-width:0}
.a-flow__dot{flex:0 0 24px;width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:var(--fs-12);font-weight:600;background:var(--surface-0);border:1.5px solid var(--control-500);color:var(--muted-700);margin-top:1px}
.a-flow__i.is-done .a-flow__dot{background:var(--teal-600);border-color:var(--teal-600);color:#fff}
.a-flow__i.is-current{border-color:var(--teal-600);box-shadow:inset 0 0 0 1px var(--teal-600);background:var(--teal-tint)}
.a-flow__i.is-current .a-flow__dot{border-color:var(--teal-600);color:var(--teal-700);background:var(--surface-0)}
.a-flow__c{min-width:0}
.a-flow__l{font-weight:600;font-size:var(--fs-14)}
.a-flow__w{font-size:var(--fs-12);color:var(--muted-700);margin-top:1px}
.a-flow__d{font-size:var(--fs-12);margin-top:4px;overflow-wrap:anywhere}
.a-next__b{display:flex;flex-direction:column;gap:var(--sp-3);align-items:flex-start}
.a-next__t{font-size:var(--fs-18);line-height:var(--lh-18);font-weight:600}
.a-next__dl{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center}
.a-dl__t{font-weight:600}
.a-dl--overdue{color:var(--danger-fg)}
.a-btnrow{display:flex;flex-wrap:wrap;gap:var(--sp-2);align-items:center;margin-top:var(--sp-2)}
.a-next__b .a-btnrow{margin-top:0}
.a-why{font-size:var(--fs-13);color:var(--muted-700);border:1px dashed var(--control-500);border-radius:var(--r-2);padding:8px 12px}
.a-flag{display:flex;gap:8px;align-items:flex-start;background:var(--warning-bg);color:var(--warning-fg);border-radius:var(--r-2);padding:10px 12px;font-size:var(--fs-13)}
.a-task{margin-top:var(--sp-4);border:1px solid var(--line-200);border-left:4px solid var(--marigold-400);border-radius:var(--r-2);padding:12px 14px;display:flex;flex-direction:column;gap:6px;align-items:flex-start;font-size:var(--fs-13)}
.a-task--done{border-left-color:var(--teal-600)}
.a-task__h{display:flex;gap:8px;align-items:center}
.a-secs{display:flex;flex-direction:column;gap:var(--sp-3)}
.a-sec>summary{list-style:none;display:flex;align-items:center;gap:var(--sp-3);padding:14px var(--sp-5);cursor:pointer;min-height:var(--h-touch)}
.a-sec>summary::-webkit-details-marker{display:none}
.a-sec>summary .ui-icon{margin-left:auto;transition:transform var(--dur)}
.a-sec[open]>summary .ui-icon{transform:rotate(180deg)}
.a-sec__t{font-size:var(--fs-16);font-weight:600}
.a-sec__s{color:var(--muted-700);font-size:var(--fs-13)}
.a-sec[open]>summary{border-bottom:1px solid var(--line-200)}
.a-sec__b{padding:var(--sp-4) var(--sp-5) var(--sp-5)}
.a-dl2{margin:0 0 var(--sp-3);display:grid;gap:0}
.a-dl2>div{display:grid;grid-template-columns:150px minmax(0,1fr);gap:12px;padding:8px 0;border-top:1px solid var(--line-200);font-size:var(--fs-13)}
.a-dl2>div:first-child{border-top:0}
.a-dl2 dt{color:var(--muted-700);font-weight:600;font-size:var(--fs-12);padding-top:2px}
.a-dl2 dd{margin:0;display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.a-docs,.a-tasks,.a-plog,.a-ass,.a-pick{list-style:none;margin:0;padding:0}
.a-doc,.a-trow{display:flex;justify-content:space-between;gap:var(--sp-3);align-items:center;padding:10px 0;border-top:1px solid var(--line-200);font-size:var(--fs-13)}
.a-doc:first-child,.a-trow:first-child{border-top:0}
.a-chips{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.a-chips--wrap{margin-bottom:var(--sp-2)}
.a-plog li{display:grid;grid-template-columns:150px minmax(0,1fr) auto;gap:12px;padding:8px 0;border-top:1px solid var(--line-200);font-size:var(--fs-13)}
.a-plog li:first-child{border-top:0}
.a-plog time{color:var(--muted-700)}
.a-kd{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--sp-3);margin-bottom:var(--sp-3)}
.a-kd__c{border:1px solid var(--line-200);border-radius:var(--r-2);padding:10px 12px;background:var(--paper-50)}
.a-kd__l{font-size:var(--fs-12);color:var(--muted-700);font-weight:600}
.a-kd__v{font-size:var(--fs-18);line-height:var(--lh-18);font-weight:600;margin:2px 0}
.a-ass li{padding:6px 0;font-size:var(--fs-13);display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.a-plan{display:flex;flex-wrap:wrap;gap:var(--sp-3);align-items:flex-end;margin-top:var(--sp-3)}
.a-plan .ui-field{margin:0}
.a-letter{white-space:pre-wrap;border:1px solid var(--marigold-400);background:#FFFDF7;border-radius:var(--r-2);padding:12px 14px;font-size:var(--fs-13)}
.a-script{border:1px solid var(--line-200);border-radius:var(--r-2);padding:8px 12px;margin-bottom:var(--sp-3);font-size:var(--fs-13)}
.a-script summary{cursor:pointer;font-weight:600}
.a-pick li{padding:6px 0;display:flex;gap:8px;align-items:center}
.ui-progress{max-width:420px;margin-bottom:var(--sp-3)}
@media (max-width:900px){.a-flow{grid-template-columns:repeat(2,minmax(0,1fr))}.a-kd{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:560px){.a-flow{grid-template-columns:1fr}.a-kd{grid-template-columns:1fr}.a-dl2>div{grid-template-columns:1fr;gap:2px}.a-plog li{grid-template-columns:1fr}.a-chead__r{justify-content:flex-start}}
.a-flow--5{--cols:5}
.a-sms{border:1px solid var(--line-200);border-radius:var(--r-2);padding:10px 12px;background:var(--paper-50);font-size:var(--fs-13);margin:var(--sp-3) 0;display:flex;flex-direction:column;gap:4px}
.a-sms__l{font-size:var(--fs-12);font-weight:600;color:var(--muted-700);display:flex;gap:8px;align-items:center}
.a-crl{list-style:none;margin:0;padding:0}
.a-cr{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-top:1px solid var(--line-200);font-size:var(--fs-13)}
.a-cr:first-child{border-top:0}
.a-cr .ui-icon{flex:0 0 auto;margin-top:2px}
.a-cr--shown .ui-icon{color:var(--teal-600)}.a-cr--ask .ui-icon{color:var(--warning-fg)}.a-cr--no .ui-icon{color:var(--danger-fg)}
.a-cr__ask{margin-top:4px;color:var(--warning-fg);font-weight:600}
.a-box{display:inline-flex;align-items:center;gap:6px;margin:2px 10px 2px 0;font-size:var(--fs-13)}
.a-box i{width:14px;height:14px;border:1.5px solid var(--control-500);border-radius:3px;display:inline-block}
.a-box i.on{background:var(--teal-600);border-color:var(--teal-600)}
.a-form{display:flex;flex-wrap:wrap;gap:var(--sp-3);align-items:flex-end;margin-top:var(--sp-3)}
.a-form .ui-field{margin:0}
.a-hist{width:100%;border-collapse:collapse;font-size:var(--fs-13);margin-top:var(--sp-2)}
.a-hist th,.a-hist td{padding:8px 10px;border-top:1px solid var(--line-200);text-align:left;vertical-align:top}
.a-hist thead th{border-top:0;font-size:var(--fs-12);color:var(--muted-700)}
.a-check{display:flex;gap:8px;align-items:center;font-size:var(--fs-13);margin:8px 0}
.a-grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--sp-3);margin-bottom:var(--sp-3)}
.a-kv{border:1px solid var(--line-200);border-radius:var(--r-2);padding:8px 12px;background:var(--paper-50);font-size:var(--fs-13)}
.a-kv__l{font-size:var(--fs-12);font-weight:600;color:var(--muted-700)}
@media (max-width:900px){.a-flow--5{--cols:2}.a-grid3{grid-template-columns:1fr}}
.a-flagbtn{display:inline-flex;align-items:center;gap:6px;min-height:24px;min-width:24px;padding:2px 8px;border:1px solid var(--control-500);border-radius:999px;background:var(--surface-0);color:var(--muted-700);font:inherit;font-size:var(--fs-12);font-weight:600;cursor:pointer;justify-content:center}
.a-flagbtn:hover{background:var(--sand-100);color:var(--ink-900)}
.a-flagbtn.is-on{background:var(--warning-bg);border-color:var(--marigold-400);color:var(--warning-fg)}
.a-flagbtn.is-on .ui-icon{fill:currentColor}
.a-flagbtn__i{display:inline-flex}
.a-fban{display:flex;gap:12px;align-items:center;flex-wrap:wrap;background:var(--warning-bg);color:var(--warning-fg);border:1px solid var(--marigold-400);border-radius:var(--r-3);padding:12px 16px;font-size:var(--fs-14)}
.a-fban__t{flex:1 1 280px;min-width:0}
.a-fban__t b{font-weight:600}
.a-grid2{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:var(--sp-4);align-items:start}
.a-col{display:flex;flex-direction:column;gap:var(--sp-4);min-width:0}
.a-pcard{background:var(--surface-0);border:1px solid var(--line-200);border-radius:var(--r-3);padding:var(--sp-4) var(--sp-5)}
.a-pcard__h{display:flex;align-items:center;gap:var(--sp-2);flex-wrap:wrap;margin:0 0 var(--sp-3)}
.a-pcard__h h2{margin:0;font-size:var(--fs-18);line-height:var(--lh-18);font-weight:600}
.a-pcard__h .a-sec__s{margin-left:auto}
.a-stats{display:flex;gap:var(--sp-5);flex-wrap:wrap;margin:var(--sp-3) 0}
.a-stat b{display:block;font-size:var(--fs-22);line-height:1.15;font-weight:600}
.a-stat span{color:var(--muted-700);font-size:var(--fs-12)}
.a-stat.is-r b{color:var(--danger-fg)}
.a-steps{display:flex;gap:6px;flex-wrap:wrap;list-style:none;margin:0 0 var(--sp-3);padding:0}
.a-steps li{display:inline-flex;align-items:center;gap:6px;font-size:var(--fs-12);font-weight:600;padding:3px 10px;border-radius:999px;border:1px solid var(--line-200);color:var(--muted-700);background:var(--paper-50)}
.a-steps li.done{background:var(--teal-tint);color:var(--teal-700);border-color:transparent}
.a-steps li.now{background:var(--teal-600);color:#fff;border-color:var(--teal-600)}
.a-dlr{display:flex;flex-direction:column;gap:var(--sp-3)}
.a-dli{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border:1px solid var(--line-200);border-radius:var(--r-2);background:var(--paper-50);flex-wrap:wrap}
.a-dli__b{flex:1 1 220px;min-width:0}
.a-dli__w{font-weight:600;font-size:var(--fs-14)}
.a-dli__s{font-size:var(--fs-12);color:var(--muted-700)}
.hx{background:var(--surface-0);border:1px solid var(--line-200);border-radius:var(--r-3)}
.hx>summary{display:flex;align-items:center;gap:10px;padding:14px var(--sp-5);cursor:pointer;list-style:none;min-height:var(--h-touch)}
.hx>summary::-webkit-details-marker{display:none}
.hx__t{margin:0;font-size:var(--fs-18);line-height:var(--lh-18);font-weight:600}
.hx__n{color:var(--muted-700);font-size:var(--fs-13)}
.hx__sp{flex:1}
.hx>summary .ui-icon{transition:transform var(--dur)}
.hx[open]>summary .ui-icon{transform:rotate(180deg)}
.hx__b{border-top:1px solid var(--line-200);padding:var(--sp-3) var(--sp-5) var(--sp-4)}
.hx__f{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 var(--sp-2)}
.hx__c{display:inline-flex;align-items:center;gap:6px;min-height:28px;padding:0 10px;border:1px solid var(--line-200);border-radius:999px;background:var(--surface-0);font:inherit;font-size:var(--fs-12);font-weight:600;color:var(--ink-900);cursor:pointer}
.hx__c b{font-weight:600;color:var(--muted-700)}
.hx__c:hover{background:var(--sand-100)}
.hx__c[aria-pressed="true"]{background:var(--teal-600);border-color:var(--teal-600);color:#fff}
.hx__c[aria-pressed="true"] b{color:#fff}
.hx__l{list-style:none;margin:0;padding:0}
.hx__r{display:grid;grid-template-columns:72px minmax(0,1fr) auto 128px;gap:4px 12px;align-items:center;padding:8px 6px;border-top:1px solid var(--line-200);border-radius:var(--r-1)}
.hx__r:first-child{border-top:0}
.hx__r[role="button"]{cursor:pointer}
.hx__r[role="button"]:hover{background:var(--sand-50)}
.hx__w{display:flex;flex-direction:column;line-height:1.2;font-size:var(--fs-12);color:var(--muted-700);white-space:nowrap}
.hx__w b{font-weight:600;color:var(--ink-900);font-size:var(--fs-13)}
.hx__m{display:flex;flex-direction:column;min-width:0;gap:1px}
.hx__a{font-size:var(--fs-13);font-weight:600;line-height:1.3;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.hx__d{font-size:var(--fs-12);color:var(--muted-700);line-height:1.35;overflow-wrap:anywhere}
.hx__v{font-size:var(--fs-12);font-weight:600;color:var(--teal-700);white-space:nowrap;text-decoration:underline;text-underline-offset:2px}
.hx__g{justify-self:end;display:inline-flex;align-items:center;gap:5px;max-width:128px;border-radius:999px;padding:1px 9px 1px 7px;font-size:var(--fs-12);font-weight:600;line-height:1.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:var(--neutral-bg);color:var(--neutral-fg)}
.hx__g.k-voice{background:var(--teal-tint);color:var(--teal-700)}
.hx__g.k-agent{background:var(--success-bg);color:var(--success-fg)}
.hx__g.k-psyflo{background:var(--info-bg);color:var(--info-fg)}
.hx__g.k-staff{background:var(--warning-bg);color:var(--warning-fg)}
.hx__g.k-lauris{background:var(--neutral-bg);color:var(--neutral-fg)}
.hx__g.k-payer{background:var(--danger-bg);color:var(--danger-fg)}
.hx__e{color:var(--muted-700);font-size:var(--fs-13);padding:6px 0}
.hx__add{display:flex;justify-content:flex-end;margin-bottom:var(--sp-2)}
.hx__legend{font-size:var(--fs-12);color:var(--muted-700);margin:var(--sp-3) 0 0}
.hp{display:flex;flex-direction:column;gap:var(--sp-3)}
.hp__h{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
@media (max-width:1100px){.a-grid2{grid-template-columns:1fr}}
@media (max-width:560px){.hx__r{grid-template-columns:60px minmax(0,1fr);grid-template-areas:"t m" "t v" "g g"}.hx__w{grid-area:t}.hx__m{grid-area:m}.hx__v{grid-area:v;justify-self:start}.hx__g{grid-area:g;justify-self:start}.hx>summary{padding:12px var(--sp-4)}.hx__b{padding:var(--sp-3) var(--sp-4)}}
`;
