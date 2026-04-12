// 数据存储
let todos = [];
let currentFilter = 'all';

// DOM元素
const taskInput = document.getElementById('taskInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');
const totalCount = document.getElementById('totalCount');
const completedCount = document.getElementById('completedCount');
const uncompletedCount = document.getElementById('uncompletedCount');

// 初始化：从本地存储读取数据
function loadTodos() {
    const stored = localStorage.getItem('todos');
    if (stored) {
        todos = JSON.parse(stored);
    }
    render();
}

// 保存到本地存储
function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

// 添加待办事项
function addTodo() {
    const text = taskInput.value.trim();
    if (text === '') {
        alert('请输入待办事项');
        return;
    }
    
    const newTodo = {
        id: Date.now(),
        text: text,
        completed: false,
        createdAt: new Date().toLocaleString()
    };
    
    todos.push(newTodo);
    taskInput.value = '';
    saveTodos();
    render();
}

// 切换完成状态
function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        saveTodos();
        render();
    }
}

// 删除待办事项
function deleteTodo(id) {
    todos = todos.filter(t => t.id !== id);
    saveTodos();
    render();
}

// 获取过滤后的待办列表
function getFilteredTodos() {
    if (currentFilter === 'active') {
        return todos.filter(t => !t.completed);
    } else if (currentFilter === 'completed') {
        return todos.filter(t => t.completed);
    }
    return todos;
}

// 更新统计数据
function updateStats() {
    const total = todos.length;
    const completed = todos.filter(t => t.completed).length;
    const uncompleted = total - completed;
    
    totalCount.textContent = total;
    completedCount.textContent = completed;
    uncompletedCount.textContent = uncompleted;
}

// 渲染待办列表
function render() {
    const filteredTodos = getFilteredTodos();
    
    if (filteredTodos.length === 0) {
        todoList.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">✨ 暂无待办事项 ✨</div>';
    } else {
        todoList.innerHTML = filteredTodos.map(todo => `
            <li class="todo-item ${todo.completed ? 'completed' : ''}">
                <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} data-id="${todo.id}">
                <span class="todo-text">${escapeHtml(todo.text)}</span>
                <button class="delete-btn" data-id="${todo.id}">删除</button>
            </li>
        `).join('');
    }
    
    updateStats();
    
    // 绑定事件（因为动态生成，需要用事件委托）
    document.querySelectorAll('.todo-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const id = parseInt(e.target.dataset.id);
            toggleTodo(id);
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.target.dataset.id);
            deleteTodo(id);
        });
    });
}

// 防止XSS攻击
function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// 筛选功能
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        render();
    });
});

// 回车添加
taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTodo();
    }
});

addBtn.addEventListener('click', addTodo);

// 启动应用
loadTodos();