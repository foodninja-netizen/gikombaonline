(function(){
  'use strict';

  const CART_KEY = 'thrift_cart_simple'; // keep existing key so current pages remain compatible

  function safeParse(json){
    try{ return JSON.parse(json); }catch{ return null }
  }

  function get(){
    const raw = localStorage.getItem(CART_KEY);
    const obj = safeParse(raw);
    return obj && typeof obj === 'object' ? obj : {};
  }

  function set(cart){
    localStorage.setItem(CART_KEY, JSON.stringify(cart||{}));
    emitChange();
  }

  function clear(){ set({}); }

  function add(id, qty = 1){
    if(!id) return;
    const cart = get();
    cart[id] = Math.max(0, (cart[id]||0) + Number(qty||0));
    if(cart[id] === 0) delete cart[id];
    set(cart);
  }

  function remove(id){
    if(!id) return;
    const cart = get();
    if(id in cart){ delete cart[id]; set(cart); }
  }

  function setQty(id, qty){
    if(!id) return;
    const cart = get();
    const q = Math.max(0, Number(qty||0));
    if(q <= 0){ delete cart[id]; }
    else { cart[id] = q; }
    set(cart);
  }

  function count(){
    const cart = get();
    return Object.values(cart).reduce((a,b)=> a + Number(b||0), 0);
  }

  function items(){
    const cart = get();
    return Object.entries(cart).map(([id, qty])=>({ id, qty: Number(qty) }));
  }

  function totals(products){
    const map = products || {};
    const cart = get();
    const subtotal = Object.entries(cart).reduce((sum, [id, qty])=>{
      const price = Number((map[id] && map[id].price) || 0);
      return sum + price * Number(qty);
    }, 0);
    const shipping = subtotal > 0 ? 5 : 0;
    const total = subtotal + shipping;
    return { subtotal, shipping, total };
  }

  function makeOrderId(){ return Math.random().toString(36).slice(2,8).toUpperCase(); }

  function receiptText(products, opts){
    const orderId = (opts && opts.orderId) || makeOrderId();
    const dateStr = new Date().toLocaleString();
    const map = products || {};
    const cart = get();
    const lines = Object.entries(cart).map(([id, qty])=>{
      const p = map[id] || { name: id, price: 0 };
      const price = Number(p.price||0);
      const line = price * Number(qty);
      return `${p.name} x ${qty} @ $${price.toFixed(2)} = $${line.toFixed(2)}`;
    });
    const { subtotal, shipping, total } = totals(map);
    const header = [
      'gikomba online — Receipt',
      `Order: ${orderId}`,
      `Date: ${dateStr}`,
      ''
    ];
    const body = lines.length ? lines : ['No items.'];
    const footer = [
      '',
      `Subtotal: $${subtotal.toFixed(2)}`,
      `Shipping: $${shipping.toFixed(2)}`,
      `Total: $${total.toFixed(2)}`
    ];
    return header.concat(body, footer).join('\n');
  }

  function downloadReceipt(products, filename){
    const text = receiptText(products);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'receipt.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=> URL.revokeObjectURL(url), 0);
  }

  // Badge helpers -----------------------------------------------------------
  function renderBadge(elOrSelector){
    const el = typeof elOrSelector === 'string' ? document.querySelector(elOrSelector) : elOrSelector;
    if(!el) return;
    el.textContent = String(count());
  }

  function autoBadge(elOrSelector){
    renderBadge(elOrSelector);
    onChange(()=> renderBadge(elOrSelector));
  }

  // Change notifications ----------------------------------------------------
  function onChange(callback){
    window.addEventListener('storage', (e)=>{ if(e.key === CART_KEY) callback(); });
    document.addEventListener('cart:changed', callback);
  }

  function emitChange(){
    document.dispatchEvent(new CustomEvent('cart:changed'));
  }

  // Public API --------------------------------------------------------------
  window.Cart = {
    key: CART_KEY,
    get,
    set,
    clear,
    add,
    remove,
    setQty,
    count,
    items,
    totals,
    receiptText,
    downloadReceipt,
    renderBadge,
    autoBadge,
    onChange,
  };
})();
