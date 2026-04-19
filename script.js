// ==================== 全局变量 ====================
let currentUser = null;
let users = JSON.parse(localStorage.getItem('app_users') || '[]');
let events = [];
let notebooks = [];
let currentCategory = 'all';
let currentStatus = 'all';
let currentNotebook = null;
let editingEventId = null;

// 全局树洞数据 (所有用户共享)
let globalTreeholePosts = [];

// 十二生肖列表
const ZODIAC = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];

function randomAlphaNum(len = 4) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for(let i = 0; i < len; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
}
function generateAnonName() {
    const zodiac = ZODIAC[Math.floor(Math.random() * ZODIAC.length)];
    const suffixLen = Math.floor(Math.random() * 4) + 3;
    return zodiac + randomAlphaNum(suffixLen);
}

function getStorageKey(type) { return `days_${type}_${currentUser}`; }
function saveUsers() { localStorage.setItem('app_users', JSON.stringify(users)); }
function saveCurrentUserData() { 
    if(!currentUser) return; 
    localStorage.setItem(getStorageKey('events'), JSON.stringify(events)); 
    localStorage.setItem(getStorageKey('notebooks'), JSON.stringify(notebooks)); 
}
function saveGlobalTreehole() {
    localStorage.setItem('days_treehole_global', JSON.stringify(globalTreeholePosts));
}
function loadGlobalTreehole() {
    const stored = localStorage.getItem('days_treehole_global');
    if(stored) {
        globalTreeholePosts = JSON.parse(stored);
        // 确保每个帖子有likes数组，每个回复有likes数组
        globalTreeholePosts.forEach(post => {
            if (!post.likes) post.likes = [];
            post.replies.forEach(reply => {
                if (!reply.likes) reply.likes = [];
            });
        });
    } else {
        globalTreeholePosts = [{
            id: Date.now(),
            content: "欢迎来到树洞！在这里匿名分享心情，温暖回响～",
            timestamp: Date.now(),
            anonName: "树洞精灵",
            userId: null,
            likes: [],
            replies: []
        }];
        saveGlobalTreehole();
    }
}

function loadUserData() { 
    if(!currentUser) { events=[]; notebooks=[]; return; } 
    events = JSON.parse(localStorage.getItem(getStorageKey('events')) || '[]'); 
    notebooks = JSON.parse(localStorage.getItem(getStorageKey('notebooks')) || '[{"id":"default","name":"默认"}]'); 
    if(events.length===0){ 
        const today=new Date(); const t2=new Date(); t2.setDate(t2.getDate()+5); const newYear=new Date(); newYear.setFullYear(newYear.getFullYear()+1,0,1); 
        events=[{id:Date.now()+1,name:'✨ 周末派对',targetDate:t2.toISOString().split('T')[0],category:'life',notebook:'default',completed:false,pinned:true,repeat:'weekly',color:'pink',notes:[],bgImage:'',createdAt:Date.now()},
                {id:Date.now()+2,name:'📖 读书会',targetDate:newYear.toISOString().split('T')[0],category:'life',notebook:'default',completed:false,pinned:false,repeat:'none',color:'blue',notes:[],bgImage:'',createdAt:Date.now()}]; 
        saveCurrentUserData(); 
    }
    events.forEach(ev => { if(ev.completed === true && !ev.completedAt) ev.completedAt = ev.createdAt || Date.now(); });
}

function getDaysDiff(targetDateStr){ const today=new Date(); today.setHours(0,0,0,0); const target=new Date(targetDateStr); target.setHours(0,0,0,0); return Math.ceil((target-today)/86400000); }
function formatLocalTime(timestamp){ const d=new Date(timestamp); return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`; }
function escapeHtml(str){ return String(str).replace(/[&<>]/g, function(m){ if(m==='&') return '&amp;'; if(m==='<') return '&lt;'; if(m==='>') return '&gt;'; return m;}); }

// ========== 用户系统 ==========
function showAuthModal(){ let mode='login'; const modal=document.getElementById('authModal'); const title=document.getElementById('authTitle'); const submitBtn=document.getElementById('authSubmitBtn'); const switchLink=document.getElementById('switchAuthMode'); document.getElementById('authUsername').value=''; document.getElementById('authPassword').value=''; const updateUI=()=>{ title.innerText=mode==='login'?'登录':'注册'; submitBtn.innerText=mode==='login'?'登录':'注册'; switchLink.innerText=mode==='login'?'还没有账号？去注册':'已有账号？去登录'; }; const submitHandler=()=>{ const username=document.getElementById('authUsername').value.trim(); const pwd=document.getElementById('authPassword').value.trim(); if(!username||!pwd){ alert('请填写用户名/密码'); return; } if(mode==='register'){ if(users.find(u=>u.username===username)){ alert('用户名已存在'); return; } users.push({username,password:pwd}); saveUsers(); alert('注册成功，请登录'); mode='login'; updateUI(); } else { const user=users.find(u=>u.username===username && u.password===pwd); if(!user){ alert('用户名或密码错误'); return; } currentUser=username; localStorage.setItem('days_current_user',currentUser); modal.classList.remove('show'); updateUserBar(); loadUserData(); renderAll(); if(document.getElementById('treeholeModule').style.display === 'block') renderTreehole(); } }; submitBtn.onclick=submitHandler; switchLink.onclick=(e)=>{ e.preventDefault(); mode=mode==='login'?'register':'login'; updateUI(); }; updateUI(); modal.classList.add('show'); }
function logout(){ currentUser=null; localStorage.removeItem('days_current_user'); events=[]; notebooks=[]; updateUserBar(); renderAll(); if(document.getElementById('treeholeModule').style.display === 'block') renderTreehole(); }
function updateUserBar(){ const greet=document.getElementById('userGreeting'); const loginBtn=document.getElementById('loginBtn'); const logoutBtn=document.getElementById('logoutBtn'); if(currentUser){ greet.innerText=`👤 ${currentUser}`; loginBtn.style.display='none'; logoutBtn.style.display='inline-block'; } else { greet.innerText='未登录'; loginBtn.style.display='inline-block'; logoutBtn.style.display='none'; } }

// 事件操作
function addEvent(data){ const newEvent={id:Date.now(),...data,completed:false,notes:[],createdAt:Date.now()}; events.push(newEvent); saveCurrentUserData(); renderAll(); }
function updateEvent(id,data){ const idx=events.findIndex(e=>e.id===id); if(idx!==-1){ events[idx]={...events[idx],...data}; saveCurrentUserData(); renderAll(); } }
function deleteEvent(id){ if(confirm('确定删除吗？')){ events=events.filter(e=>e.id!==id); saveCurrentUserData(); renderAll(); } }
function toggleComplete(id){ const ev=events.find(e=>e.id===id); if(ev){ ev.completed=!ev.completed; if(ev.completed) ev.completedAt=Date.now(); else delete ev.completedAt; saveCurrentUserData(); renderAll(); } }
function togglePinned(id){ const ev=events.find(e=>e.id===id); if(ev){ ev.pinned=!ev.pinned; saveCurrentUserData(); renderAll(); } }
function addNoteToEvent(eventId,text){ const ev=events.find(e=>e.id===eventId); if(ev&&text.trim()){ ev.notes.push({id:Date.now(),text:text.trim()}); saveCurrentUserData(); renderAll(); } }
function deleteNote(eventId,noteId){ const ev=events.find(e=>e.id===eventId); if(ev){ ev.notes=ev.notes.filter(n=>n.id!==noteId); saveCurrentUserData(); renderAll(); } }

// ========== 树洞全局操作 ==========
function publishPost(){ 
    if(!currentUser){ alert('请先登录后再发布心声~'); return; }
    const content=document.getElementById('treeholeContent').value.trim(); 
    if(!content) return;
    const newPost={
        id: Date.now(),
        content: content,
        timestamp: Date.now(),
        anonName: generateAnonName(),
        userId: currentUser,
        likes: [],
        replies: []
    }; 
    globalTreeholePosts.unshift(newPost); 
    saveGlobalTreehole();
    document.getElementById('treeholeContent').value=''; 
    renderTreehole(); 
}
function addReply(postId,replyText){ 
    if(!currentUser){ alert('请先登录后再回复~'); return; }
    if(!replyText.trim()) return; 
    const post=globalTreeholePosts.find(p=>p.id===postId); 
    if(post){ 
        post.replies.push({
            id: Date.now(),
            content: replyText,
            timestamp: Date.now(),
            anonName: generateAnonName(),
            userId: currentUser,
            likes: []
        }); 
        saveGlobalTreehole(); 
        renderTreehole(); 
    } 
}
// 点赞/取消点赞帖子
function toggleLikePost(postId) {
    if(!currentUser) { alert('请先登录'); return; }
    const post = globalTreeholePosts.find(p => p.id === postId);
    if(!post) return;
    const idx = post.likes.indexOf(currentUser);
    if(idx === -1) {
        post.likes.push(currentUser);
    } else {
        post.likes.splice(idx, 1);
    }
    saveGlobalTreehole();
    renderTreehole();
}
// 点赞/取消点赞回复
function toggleLikeReply(postId, replyId) {
    if(!currentUser) { alert('请先登录'); return; }
    const post = globalTreeholePosts.find(p => p.id === postId);
    if(!post) return;
    const reply = post.replies.find(r => r.id === replyId);
    if(!reply) return;
    const idx = reply.likes.indexOf(currentUser);
    if(idx === -1) {
        reply.likes.push(currentUser);
    } else {
        reply.likes.splice(idx, 1);
    }
    saveGlobalTreehole();
    renderTreehole();
}
function deletePost(postId) {
    const post = globalTreeholePosts.find(p => p.id === postId);
    if(!post) return;
    if(post.userId !== currentUser) { alert('只能删除自己发布的心声'); return; }
    if(confirm('确定删除这条心声吗？')) {
        globalTreeholePosts = globalTreeholePosts.filter(p => p.id !== postId);
        saveGlobalTreehole();
        renderTreehole();
    }
}
function deleteReply(postId, replyId) {
    const post = globalTreeholePosts.find(p => p.id === postId);
    if(!post) return;
    const reply = post.replies.find(r => r.id === replyId);
    if(!reply) return;
    if(reply.userId !== currentUser) { alert('只能删除自己的回复'); return; }
    if(confirm('确定删除这条回复吗？')) {
        post.replies = post.replies.filter(r => r.id !== replyId);
        saveGlobalTreehole();
        renderTreehole();
    }
}

function renderTreehole(){ 
    const container=document.getElementById('postsList'); 
    if(!container) return; 
    const isLoggedIn = !!currentUser;
    const postFormDiv = document.getElementById('treeholePostForm');
    const loginTipDiv = document.getElementById('treeholeLoginTip');
    if(isLoggedIn) {
        postFormDiv.style.display = 'block';
        loginTipDiv.style.display = 'none';
    } else {
        postFormDiv.style.display = 'none';
        loginTipDiv.style.display = 'block';
    }
    if(globalTreeholePosts.length===0){ container.innerHTML='<div class="empty-state">✨ 还没有心声，来发布第一条吧</div>'; return; } 
    container.innerHTML=globalTreeholePosts.map(post => {
        const canDeletePost = isLoggedIn && post.userId === currentUser;
        const postLiked = isLoggedIn && post.likes && post.likes.includes(currentUser);
        const postLikeCount = post.likes ? post.likes.length : 0;
        return `<div class="post-card" data-postid="${post.id}">
            <div class="post-header">
                <span class="post-anon">🌿 ${escapeHtml(post.anonName)}</span>
                <div style="display:flex; gap:8px; align-items:center;">
                    <span class="post-time">${formatLocalTime(post.timestamp)}</span>
                    ${canDeletePost ? `<button class="delete-post-btn" data-postid="${post.id}">🗑️ 删除</button>` : ''}
                </div>
            </div>
            <div class="post-content">${escapeHtml(post.content)}</div>
            <div class="post-actions">
                <button class="reply-btn ${!isLoggedIn ? 'disabled-reply' : ''}" data-postid="${post.id}" ${!isLoggedIn ? 'disabled' : ''}>💬 回复</button>
                <button class="like-post-btn ${postLiked ? 'liked' : ''}" data-postid="${post.id}">❤️ ${postLikeCount}</button>
            </div>
            <div class="replies-area" id="replies-${post.id}">
                ${post.replies.map(r => {
                    const canDeleteReply = isLoggedIn && r.userId === currentUser;
                    const replyLiked = isLoggedIn && r.likes && r.likes.includes(currentUser);
                    const replyLikeCount = r.likes ? r.likes.length : 0;
                    return `<div class="reply-item" data-replyid="${r.id}">
                        <div class="reply-header">
                            <span>🍃 ${escapeHtml(r.anonName)}</span>
                            <div class="reply-right-actions">
                                <button class="like-reply-btn ${replyLiked ? 'liked' : ''}" data-postid="${post.id}" data-replyid="${r.id}">❤️ ${replyLikeCount}</button>
                                ${canDeleteReply ? `<button class="delete-reply-btn" data-postid="${post.id}" data-replyid="${r.id}">❌ 删除</button>` : ''}
                            </div>
                        </div>
                        <div>${escapeHtml(r.content)}</div>
                        <div class="post-time" style="margin-top:4px;">${formatLocalTime(r.timestamp)}</div>
                    </div>`;
                }).join('')}
            </div>
        </div>`;
    }).join(''); 
    // 绑定回复按钮
    document.querySelectorAll('.reply-btn').forEach(btn=>{ 
        btn.addEventListener('click',(e)=>{ 
            if(!currentUser){ alert('请先登录后才能回复'); return; }
            const pid=parseInt(btn.dataset.postid); 
            const area=document.getElementById(`replies-${pid}`); 
            if(area.querySelector('.reply-form')) return; 
            const formDiv=document.createElement('div'); 
            formDiv.className='reply-form'; 
            formDiv.innerHTML='<input type="text" class="reply-input" placeholder="写下你的回音..."><button class="reply-submit">发送</button>'; 
            area.appendChild(formDiv); 
            formDiv.querySelector('.reply-submit').onclick=()=>{ const val=formDiv.querySelector('.reply-input').value; if(val) addReply(pid,val); }; 
        }); 
    });
    // 点赞帖子
    document.querySelectorAll('.like-post-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const postId = parseInt(btn.dataset.postid);
            toggleLikePost(postId);
        });
    });
    // 删除帖子
    document.querySelectorAll('.delete-post-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const postId = parseInt(btn.dataset.postid);
            deletePost(postId);
        });
    });
    // 删除回复
    document.querySelectorAll('.delete-reply-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const postId = parseInt(btn.dataset.postid);
            const replyId = parseInt(btn.dataset.replyid);
            deleteReply(postId, replyId);
        });
    });
    // 点赞回复
    document.querySelectorAll('.like-reply-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const postId = parseInt(btn.dataset.postid);
            const replyId = parseInt(btn.dataset.replyid);
            toggleLikeReply(postId, replyId);
        });
    });
}

// 渲染事件 (支持背景图)
function renderEvents(){ 
    let filtered=events.filter(e=>true);
    if(currentCategory!=='all') filtered=filtered.filter(e=>e.category===currentCategory);
    if(currentNotebook) filtered=filtered.filter(e=>e.notebook===currentNotebook);
    if(currentStatus==='upcoming') filtered=filtered.filter(e=>getDaysDiff(e.targetDate)>=0);
    else if(currentStatus==='passed') filtered=filtered.filter(e=>getDaysDiff(e.targetDate)<0);
    else if(currentStatus==='pinned') filtered=filtered.filter(e=>e.pinned===true);
    filtered.sort((a,b)=>(b.pinned-a.pinned)||getDaysDiff(a.targetDate)-getDaysDiff(b.targetDate));
    const grid=document.getElementById('eventsGrid');
    if(filtered.length===0){ grid.innerHTML='<div class="empty-state">📭 暂无事件，点击➕添加</div>'; return; }
    grid.innerHTML=filtered.map(ev=>{ 
        const days=getDaysDiff(ev.targetDate); 
        const isUrgent=days>=0&&days<=3; 
        const clsTheme=ev.color!=='default'?`theme-${ev.color}`:'';
        const bgStyle = ev.bgImage ? `background-image: url('${ev.bgImage}'); background-size: cover; background-position: center;` : '';
        return `<div class="event-card ${ev.pinned?'pinned':''} ${clsTheme}" style="${bgStyle}" data-id="${ev.id}">
            <div class="card-header"><div class="event-name">${escapeHtml(ev.name)}</div><div class="event-badges">${ev.pinned?'<span class="badge-pinned">📌</span>':''}<span class="badge-category">${ev.category==='life'?'🌸':ev.category==='work'?'💼':'🎂'}</span></div></div>
            <div class="days-area"><div class="days-number ${isUrgent?'urgent':''}">${Math.abs(days)}</div><div class="days-label">${days===0?'就是今天！':days>0?'天后':'天前'}</div></div>
            <div class="event-date">📅 ${ev.targetDate}</div>
            ${ev.notes.length?`<div class="notes-preview">📝 ${escapeHtml(ev.notes[0].text)}${ev.notes.length>1?` 等${ev.notes.length}条`:''}</div>`:''}
            <div class="card-footer"><label class="complete-area"><input type="checkbox" ${ev.completed?'checked':''} class="complete-check" data-id="${ev.id}"> 已完成</label><div class="card-actions"><button class="icon-action edit-event" data-id="${ev.id}" data-action="edit">✏️</button><button class="icon-action" data-id="${ev.id}" data-action="pin">📌</button><button class="icon-action" data-id="${ev.id}" data-action="delete">🗑️</button><button class="icon-action note-icon" data-id="${ev.id}" data-action="note">📝</button></div></div>
        </div>`; 
    }).join(''); 
    document.querySelectorAll('.complete-check').forEach(cb=>cb.addEventListener('change',()=>toggleComplete(parseInt(cb.dataset.id)))); 
    document.querySelectorAll('.icon-action').forEach(btn=>btn.addEventListener('click',(e)=>{ e.stopPropagation(); const id=parseInt(btn.dataset.id); const action=btn.dataset.action; if(action==='delete') deleteEvent(id); if(action==='pin') togglePinned(id); if(action==='note'){ window.currentNoteEventId=id; const evFind=events.find(e=>e.id===id); const notesList=document.getElementById('notesList'); notesList.innerHTML=evFind.notes.map(n=>`<li class="note-item">${escapeHtml(n.text)}<button class="delete-note" data-noteid="${n.id}">❌</button></li>`).join(''); document.getElementById('notesModal').classList.add('show'); document.getElementById('addNoteBtn').onclick=()=>{ const input=document.getElementById('newNoteInput'); if(input.value.trim()){ addNoteToEvent(id,input.value); input.value=''; document.getElementById('notesModal').classList.remove('show'); } }; document.querySelectorAll('.delete-note').forEach(del=>del.addEventListener('click',(ev2)=>{ deleteNote(id,parseInt(del.dataset.noteid)); document.getElementById('notesModal').classList.remove('show'); })); } if(action==='edit'){ editingEventId=id; const evt=events.find(e=>e.id===id); document.getElementById('modalTitle').innerText='编辑事件'; document.getElementById('eventName').value=evt.name; document.getElementById('eventDate').value=evt.targetDate; document.getElementById('eventCategory').value=evt.category; document.getElementById('eventNotebook').value=evt.notebook; document.getElementById('eventPinned').checked=evt.pinned||false; document.getElementById('eventRepeat').value=evt.repeat||'none'; document.getElementById('eventColor').value=evt.color||'default'; document.getElementById('eventBgImage').value = ''; document.getElementById('bgPreview').innerHTML = evt.bgImage ? `<img src="${evt.bgImage}" class="bg-preview">` : ''; window.tempBgImage = evt.bgImage || ''; document.getElementById('eventModal').classList.add('show'); } 
    })); 
}
function updateStatsCounts(){ 
    document.getElementById('totalEvents').innerText=events.length; 
    document.getElementById('upcomingEvents').innerText=events.filter(e=>getDaysDiff(e.targetDate)>=0).length; 
    document.getElementById('allCount').innerText=events.length; 
    document.getElementById('lifeCount').innerText=events.filter(e=>e.category==='life').length; 
    document.getElementById('workCount').innerText=events.filter(e=>e.category==='work').length; 
    document.getElementById('anniversaryCount').innerText=events.filter(e=>e.category==='anniversary').length; 
}
function renderNotebooks(){ const container=document.getElementById('notebookList'); container.innerHTML=notebooks.map(nb=>`<div class="notebook-item ${currentNotebook===nb.id?'active':''}" data-id="${nb.id}"><span class="notebook-name">📘 ${escapeHtml(nb.name)}</span>${nb.id!=='default'?`<button class="delete-notebook" data-id="${nb.id}">✖</button>`:''}</div>`).join(''); document.querySelectorAll('.notebook-item').forEach(el=>{ el.addEventListener('click',(e)=>{ if(e.target.classList.contains('delete-notebook')){ const id=e.target.dataset.id; if(id!=='default'){ notebooks=notebooks.filter(n=>n.id!==id); if(currentNotebook===id) currentNotebook=null; saveCurrentUserData(); renderNotebooks(); renderAll(); } } else { currentNotebook=el.dataset.id; document.getElementById('countdownModule').style.display='block'; document.getElementById('treeholeModule').style.display='none'; document.getElementById('calculatorModule').style.display='none'; document.getElementById('milestonesModule').style.display='none'; document.getElementById('currentCategoryTitle').innerText=`📓 ${notebooks.find(n=>n.id===currentNotebook)?.name||'倒数本'}`; renderAll(); } }); }); }
function addNotebook(){ const name=prompt('请输入倒数本名称'); if(name){ notebooks.push({id:Date.now().toString(),name}); saveCurrentUserData(); renderNotebooks(); } }
function renderMilestonesPage(){ document.getElementById('totalDaysRecordPage').innerText=events.length; const completedEvents = events.filter(e=>e.completed===true); document.getElementById('completedEventsCountPage').innerText=completedEvents.length; document.getElementById('longestStreakPage').innerText=Math.min(completedEvents.length, 15); const milestoneList=document.getElementById('milestoneListPage'); if(completedEvents.length === 0){ milestoneList.innerHTML='<div class="empty-state">✨ 暂无已完成事件，去完成一些吧 ✨</div>'; return; } const sorted = [...completedEvents].sort((a,b) => (b.completedAt || 0) - (a.completedAt || 0)); milestoneList.innerHTML = sorted.map(ev => `<div class="milestone-item"><span class="milestone-name">🎉 ${escapeHtml(ev.name)}</span><span class="milestone-time">✅ 完成于 ${ev.completedAt ? formatLocalTime(ev.completedAt) : '未知'}</span></div>`).join(''); }
function renderAll(){ renderEvents(); updateStatsCounts(); renderNotebooks(); if(document.getElementById('milestonesModule').style.display==='block') renderMilestonesPage(); }
function openAddModal(){ editingEventId=null; document.getElementById('modalTitle').innerText='添加新事件'; document.getElementById('eventName').value=''; document.getElementById('eventDate').value=''; document.getElementById('eventCategory').value='life'; document.getElementById('eventPinned').checked=false; document.getElementById('eventRepeat').value='none'; document.getElementById('eventColor').value='default'; document.getElementById('eventBgImage').value=''; document.getElementById('bgPreview').innerHTML=''; window.tempBgImage = ''; const select=document.getElementById('eventNotebook'); select.innerHTML=notebooks.map(nb=>`<option value="${nb.id}">${escapeHtml(nb.name)}</option>`).join(''); document.getElementById('eventModal').classList.add('show'); }

function setupBgImageUpload() {
    const fileInput = document.getElementById('eventBgImage');
    const previewDiv = document.getElementById('bgPreview');
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if(file) {
            const reader = new FileReader();
            reader.onload = function(ev) {
                const imgUrl = ev.target.result;
                previewDiv.innerHTML = `<img src="${imgUrl}" class="bg-preview">`;
                window.tempBgImage = imgUrl;
            };
            reader.readAsDataURL(file);
        } else {
            previewDiv.innerHTML = '';
            window.tempBgImage = '';
        }
    });
}

function bindEvents(){ 
    document.getElementById('menuBtn').onclick=()=>document.getElementById('sidebar').classList.add('open'); 
    document.getElementById('closeSidebar').onclick=()=>document.getElementById('sidebar').classList.remove('open'); 
    document.getElementById('openAddModalBtn').onclick=openAddModal; 
    document.getElementById('addNotebookBtn').onclick=addNotebook; 
    document.getElementById('showTreehole').onclick=()=>{ document.getElementById('countdownModule').style.display='none'; document.getElementById('treeholeModule').style.display='block'; document.getElementById('calculatorModule').style.display='none'; document.getElementById('milestonesModule').style.display='none'; document.getElementById('currentCategoryTitle').innerText='树洞'; renderTreehole(); }; 
    document.getElementById('showCalculator').onclick=()=>{ document.getElementById('countdownModule').style.display='none'; document.getElementById('treeholeModule').style.display='none'; document.getElementById('calculatorModule').style.display='block'; document.getElementById('milestonesModule').style.display='none'; document.getElementById('currentCategoryTitle').innerText='日期计算器'; }; 
    document.getElementById('showMilestones').onclick=()=>{ document.getElementById('countdownModule').style.display='none'; document.getElementById('treeholeModule').style.display='none'; document.getElementById('calculatorModule').style.display='none'; document.getElementById('milestonesModule').style.display='block'; document.getElementById('currentCategoryTitle').innerText='里程碑'; renderMilestonesPage(); }; 
    document.querySelectorAll('.category-item').forEach(el=>el.addEventListener('click',()=>{ currentCategory=el.dataset.category; currentNotebook=null; document.getElementById('countdownModule').style.display='block'; document.getElementById('treeholeModule').style.display='none'; document.getElementById('calculatorModule').style.display='none'; document.getElementById('milestonesModule').style.display='none'; document.getElementById('currentCategoryTitle').innerText=el.querySelector('.category-name').innerText; document.querySelectorAll('.category-item').forEach(c=>c.classList.remove('active')); el.classList.add('active'); renderAll(); })); 
    document.querySelectorAll('.filter-chip').forEach(chip=>chip.addEventListener('click',()=>{ document.querySelectorAll('.filter-chip').forEach(c=>c.classList.remove('active')); chip.classList.add('active'); currentStatus=chip.dataset.status; renderAll(); })); 
    document.getElementById('saveEventBtn').onclick=()=>{ 
        const name=document.getElementById('eventName').value.trim(); 
        if(!name) return alert('请输入事件名称'); 
        let targetDate=document.getElementById('eventDate').value; 
        if(!targetDate){ const def=new Date(); def.setDate(def.getDate()+7); targetDate=def.toISOString().split('T')[0]; } 
        const bgImage = window.tempBgImage || '';
        const data={ 
            name, targetDate, 
            category:document.getElementById('eventCategory').value, 
            notebook:document.getElementById('eventNotebook').value, 
            pinned:document.getElementById('eventPinned').checked, 
            repeat:document.getElementById('eventRepeat').value, 
            color:document.getElementById('eventColor').value,
            bgImage: bgImage
        }; 
        if(editingEventId) updateEvent(editingEventId,data); 
        else addEvent(data); 
        document.getElementById('eventModal').classList.remove('show'); 
        window.tempBgImage = '';
    }; 
    document.getElementById('publishPostBtn').onclick=publishPost; 
    document.getElementById('calcBtnPage').onclick=()=>{ const start=document.getElementById('calcStartDate').value; const end=document.getElementById('calcEndDate').value; if(start&&end){ const diff=Math.ceil((new Date(end)-new Date(start))/86400000); document.getElementById('calcResultPage').innerHTML=`📅 相差 ${Math.abs(diff)} 天`; } else alert('请选择日期'); }; 
    document.getElementById('loginBtn').onclick=showAuthModal; 
    document.getElementById('logoutBtn').onclick=logout; 
    document.querySelectorAll('.close-modal').forEach(btn=>btn.addEventListener('click',()=>document.querySelectorAll('.modal').forEach(m=>m.classList.remove('show')))); 
    document.getElementById('advToggle')?.addEventListener('click',()=>document.getElementById('advPanel').classList.toggle('show')); 
    window.addEventListener('click',(e)=>{ if(e.target.classList.contains('modal')) e.target.classList.remove('show'); }); 
    setupBgImageUpload();
}
function init(){ 
    loadGlobalTreehole(); 
    const savedUser=localStorage.getItem('days_current_user'); 
    if(savedUser&&users.find(u=>u.username===savedUser)) currentUser=savedUser; 
    updateUserBar(); 
    loadUserData(); 
    bindEvents(); 
    renderAll(); 
    if(!currentUser) showAuthModal(); 
}
init();
