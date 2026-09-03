/* TradeSquare — support chat widget.
   Drop-in: add  <script src="/support-widget.js" defer></script>  to any page.
   Routes through /.netlify/functions/ask (your key, your proxy). */
(function(){
  if (window.__tsw_loaded) return; window.__tsw_loaded = true;

  var AI_ENDPOINT = '/.netlify/functions/ask';
  var SUPPORT_EMAIL = 'info@tradesqai.com';

  var CONFIG = {
    businessName: "TradeSquare",
    welcomeMessage: "Hey — welcome to TradeSquare support. I can help with Materials, Takeoff, Invoice, your account, or billing. What's going on?",
    quickReplies: ["How does Takeoff work?", "Materials price accuracy", "Billing & plans", "Talk to a human"],
    systemPrompt: "You are the support assistant for TradeSquare (tradesqai.com), a Claude-powered tool built for tradespeople — contractors, electricians, roofers, and other trades. TradeSquare's tagline is \"Measure Twice. Ask Once.\"\n\n"
      + "TradeSquare's tools:\n"
      + "- Ask: plain-language answers to trade questions (wire sizes, pipe slope, spans, code references). It only answers trade/construction topics.\n"
      + "- Materials: looks up a current U.S. retail price for a material and adds it to a running tally/estimate. Prices are estimates — confirm with the supplier before ordering.\n"
      + "- Takeoff: reads an uploaded plan-set PDF and pulls a material takeoff (quantities, dimensions, counted symbols). Always a starting draft — check numbers before bidding.\n"
      + "- Invoice: drafts invoice line items from a plain-language job description, which the user edits and sends.\n\n"
      + "Plans (current): Apprentice is free with a limited number of searches per day. Journeyman is $19/month with unlimited searches. Master is $49/month and adds Plan Takeoff — 6 takeoffs per month, with more available to purchase; the monthly allowance resets each month. For exact, up-to-date details point users to the Pricing page on the site. Do not invent limits you are unsure of.\n\n"
      + "Always respect: TradeSquare gives guidance only, never a stamp of compliance. Never state or imply an answer is verified against local building code or an AHJ — remind users to confirm code-specific or safety-critical questions with their local code and AHJ.\n\n"
      + "You do NOT have access to a real user's account, saved projects, or billing records. If someone asks about their specific account, invoice, charge, or takeoff history, ask what they're trying to do and let them know a human teammate will follow up by email at " + SUPPORT_EMAIL + ". If someone asks for a human, acknowledge it and ask for the best email to reach them.\n\n"
      + "Tone: direct, plainspoken, respectful of the user's time — like a sharp foreman, not a corporate script. Trades-savvy, never condescending. Keep answers tight."
  };

  var CSS = ""
   + ".tsw{--pine:#0E1116;--pine-dark:#05070A;--gold:#FF5A1F;--gold-light:#FFD3C2;--paper:#FFFFFF;--bubble-bot:#EDF0F1;--text:#161B22;--text-soft:#6B7580;--border:#DDE1E4;--rust:#D8410F;--fd:'Oswald','Arial Narrow',sans-serif;--fb:'Barlow',system-ui,sans-serif;font-family:var(--fb);}"
   + ".tsw *{box-sizing:border-box;}"
   + ".tsw-launcher{position:fixed;right:24px;bottom:24px;width:60px;height:60px;border-radius:50%;background:var(--pine);border:none;cursor:pointer;box-shadow:0 8px 24px rgba(14,17,22,.35);display:flex;align-items:center;justify-content:center;transition:transform .15s,box-shadow .15s;z-index:2147483000;}"
   + ".tsw-launcher:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(14,17,22,.45);}"
   + ".tsw-launcher--hidden{display:none;}"
   + ".tsw-launcher .tsw-dot{position:absolute;top:4px;right:4px;width:12px;height:12px;border-radius:50%;background:#5FA37A;border:2px solid var(--pine);}"
   + ".tsw-launcher .tsw-dot::after{content:'';position:absolute;inset:0;border-radius:50%;background:#5FA37A;animation:tsw-pulse 2s ease-out infinite;}"
   + ".tsw-panel{position:fixed;right:24px;bottom:24px;width:380px;height:min(600px,80vh);background:var(--paper);border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(14,17,22,.3);display:none;flex-direction:column;border:1px solid var(--border);z-index:2147483000;}"
   + ".tsw-panel--open{display:flex;}"
   + ".tsw-header{background:linear-gradient(160deg,var(--pine),var(--pine-dark));color:#fff;padding:16px 18px;flex-shrink:0;display:flex;align-items:flex-start;justify-content:space-between;}"
   + ".tsw-header-name{font-family:var(--fd);font-weight:700;font-size:20px;margin:0;letter-spacing:.01em;text-transform:uppercase;}"
   + ".tsw-header-tagline{font-size:11px;font-style:italic;color:rgba(255,255,255,.65);margin:3px 0 0;}"
   + ".tsw-header-status{display:flex;align-items:center;gap:6px;margin-top:6px;font-size:12px;color:rgba(255,255,255,.75);}"
   + ".tsw-header-status .tsw-dot{width:7px;height:7px;border-radius:50%;background:#5FA37A;position:relative;}"
   + ".tsw-header-status .tsw-dot::after{content:'';position:absolute;inset:0;border-radius:50%;background:#5FA37A;animation:tsw-pulse 2s ease-out infinite;}"
   + ".tsw-close{background:none;border:none;cursor:pointer;padding:4px;color:#fff;opacity:.8;border-radius:6px;}"
   + ".tsw-close:hover{opacity:1;}"
   + ".tsw-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;}"
   + ".tsw-bubble{max-width:80%;padding:10px 13px;font-size:14px;line-height:1.5;white-space:pre-wrap;word-wrap:break-word;}"
   + ".tsw-bubble--assistant{align-self:flex-start;background:var(--bubble-bot);color:var(--text);border-radius:15px 15px 15px 4px;}"
   + ".tsw-bubble--user{align-self:flex-end;background:var(--pine);color:#fff;border-radius:15px 15px 4px 15px;}"
   + ".tsw-bubble--error{align-self:flex-start;background:#F7E7DF;color:var(--rust);border-radius:15px 15px 15px 4px;}"
   + ".tsw-typing{align-self:flex-start;background:var(--bubble-bot);border-radius:15px 15px 15px 4px;padding:12px 15px;display:flex;gap:4px;}"
   + ".tsw-typing span{width:6px;height:6px;border-radius:50%;background:var(--text-soft);animation:tsw-bounce 1.2s infinite ease-in-out;}"
   + ".tsw-typing span:nth-child(2){animation-delay:.15s;}.tsw-typing span:nth-child(3){animation-delay:.3s;}"
   + ".tsw-quick-replies{display:flex;flex-wrap:wrap;gap:6px;padding:0 16px 12px;}"
   + ".tsw-chip{background:#fff;border:1px solid var(--gold-light);color:var(--pine);font-family:var(--fb);font-size:12.5px;font-weight:600;padding:7px 12px;border-radius:10px;cursor:pointer;}"
   + ".tsw-chip:hover{background:#FFF3EE;border-color:var(--gold);}"
   + ".tsw-input-row{display:flex;align-items:center;gap:8px;padding:12px;border-top:1px solid var(--border);flex-shrink:0;background:var(--paper);}"
   + ".tsw-input-row input{flex:1;border:1px solid var(--border);border-radius:12px;padding:10px 13px;font-family:var(--fb);font-size:14px;background:#fff;color:var(--text);}"
   + ".tsw-input-row input::placeholder{color:var(--text-soft);}"
   + ".tsw-send{width:38px;height:38px;border-radius:50%;border:none;background:var(--gold);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s;}"
   + ".tsw-send:hover:not(:disabled){background:var(--rust);}"
   + ".tsw-send:disabled{background:#B7BBAF;cursor:not-allowed;}"
   + ".tsw-footnote{text-align:center;font-size:10.5px;color:var(--text-soft);padding:0 12px 10px;flex-shrink:0;background:var(--paper);}"
   + ".tsw *:focus-visible{outline:2px solid var(--gold);outline-offset:2px;}"
   + "@keyframes tsw-pulse{0%{opacity:.7;transform:scale(1);}100%{opacity:0;transform:scale(2.4);}}"
   + "@keyframes tsw-bounce{0%,60%,100%{transform:translateY(0);opacity:.5;}30%{transform:translateY(-4px);opacity:1;}}"
   + "@media (prefers-reduced-motion:reduce){.tsw-dot::after,.tsw-typing span{animation:none;}}"
   + "@media (max-width:480px){.tsw-panel{right:0;bottom:0;width:100%;height:100%;border-radius:0;}.tsw-launcher{right:18px;bottom:18px;}}";

  var HTML = ""
   + '<button class="tsw-launcher" id="tsw-launcher" aria-label="Open support chat">'
   +   '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 3 H8 V17 H20 V21 H4 Z" fill="#fff"/><path d="M6 6h1.4M6 9h1.4M6 12h1.4" stroke="#0E1116" stroke-width="1" stroke-linecap="round"/><path d="M10 19v-1.4M13 19v-1.4M16 19v-1.4" stroke="#0E1116" stroke-width="1" stroke-linecap="round"/></svg>'
   +   '<span class="tsw-dot"></span>'
   + '</button>'
   + '<div class="tsw-panel" id="tsw-panel">'
   +   '<div class="tsw-header"><div>'
   +     '<p class="tsw-header-name" id="tsw-business-name">TradeSquare</p>'
   +     '<p class="tsw-header-tagline">Measure Twice. Ask Once.</p>'
   +     '<div class="tsw-header-status"><span class="tsw-dot"></span> Usually replies in a few minutes</div>'
   +   '</div><button class="tsw-close" id="tsw-close" aria-label="Minimize chat"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div>'
   +   '<div class="tsw-messages" id="tsw-messages" role="log" aria-live="polite" aria-label="Chat messages"></div>'
   +   '<div class="tsw-quick-replies" id="tsw-quick-replies"></div>'
   +   '<div class="tsw-input-row"><input id="tsw-input" type="text" placeholder="Type your message…" aria-label="Type your message" autocomplete="off"><button class="tsw-send" id="tsw-send" aria-label="Send message"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 11l18-7-7 18-3-7-8-4z" stroke="#fff" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"/></svg></button></div>'
   +   '<div class="tsw-footnote">Powered by Claude · TradeSquare Support</div>'
   + '</div>';

  function boot(){
    var style=document.createElement('style');style.textContent=CSS;document.head.appendChild(style);
    var root=document.createElement('div');root.className='tsw';root.id='tsw-root';root.innerHTML=HTML;document.body.appendChild(root);

    var apiHistory=[], isLoading=false;
    var messagesEl=root.querySelector('#tsw-messages'), quickRepliesEl=root.querySelector('#tsw-quick-replies'),
        inputEl=root.querySelector('#tsw-input'), sendBtn=root.querySelector('#tsw-send'),
        panelEl=root.querySelector('#tsw-panel'), launcherEl=root.querySelector('#tsw-launcher'), closeBtn=root.querySelector('#tsw-close');

    function scrollToBottom(){messagesEl.scrollTop=messagesEl.scrollHeight;}
    function appendBubble(role,text){var d=document.createElement('div');d.className='tsw-bubble tsw-bubble--'+role;d.textContent=text;messagesEl.appendChild(d);scrollToBottom();}
    function renderQuickReplies(){quickRepliesEl.innerHTML='';CONFIG.quickReplies.forEach(function(label){var b=document.createElement('button');b.className='tsw-chip';b.type='button';b.textContent=label;b.addEventListener('click',function(){handleSend(label);});quickRepliesEl.appendChild(b);});}
    function hideQuickReplies(){quickRepliesEl.innerHTML='';}
    function showTyping(){var d=document.createElement('div');d.className='tsw-typing';d.id='tsw-typing';d.innerHTML='<span></span><span></span><span></span>';messagesEl.appendChild(d);scrollToBottom();}
    function hideTyping(){var e=root.querySelector('#tsw-typing');if(e)e.remove();}
    function setLoading(v){isLoading=v;sendBtn.disabled=v;}

    function handleSend(overrideText){
      var text=(overrideText!==undefined?overrideText:inputEl.value).trim();
      if(!text||isLoading)return;
      hideQuickReplies();appendBubble('user',text);apiHistory.push({role:'user',content:text});
      inputEl.value='';setLoading(true);showTyping();
      fetch(AI_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({system:CONFIG.systemPrompt,messages:apiHistory})})
        .then(function(r){if(!r.ok)throw new Error('http');return r.json();})
        .then(function(d){
          if(d&&d.error)throw new Error(d.error.message||'error');
          var reply=(typeof d.text==='string'&&d.text.trim())?d.text.trim():"Sorry, could you rephrase that?";
          hideTyping();appendBubble('assistant',reply);apiHistory.push({role:'assistant',content:reply});
        })
        .catch(function(){hideTyping();appendBubble('error',"I'm having trouble connecting right now. Please try again in a moment, or reach us at "+SUPPORT_EMAIL+".");apiHistory.pop();})
        .then(function(){setLoading(false);inputEl.focus();});
    }

    sendBtn.addEventListener('click',function(){handleSend();});
    inputEl.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();handleSend();}});
    launcherEl.addEventListener('click',function(){panelEl.classList.add('tsw-panel--open');launcherEl.classList.add('tsw-launcher--hidden');inputEl.focus();});
    closeBtn.addEventListener('click',function(){panelEl.classList.remove('tsw-panel--open');launcherEl.classList.remove('tsw-launcher--hidden');});

    root.querySelector('#tsw-business-name').textContent=CONFIG.businessName;
    appendBubble('assistant',CONFIG.welcomeMessage);
    renderQuickReplies();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
