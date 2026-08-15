/**
 * 알리 할일 - 친근한 악어와 함께하는 할일관리 앱
 */

// ===== State =====
let currentDate = new Date();
let selectedDate = null;
let currentTheme = null;
let tasks = {};
let dismissedAdDate = null;
let notificationTimers = new Map();
let currentViewMode = null;
let taskViewDate = new Date();
let dayListViewDate = null;
let listFilter = 'all';
const NOTIF_CHECK_INTERVAL = 10000;
const MAX_SETTIMEOUT_DELAY = 2147483647;

// ===== DOM Elements =====
const calendarGrid = document.getElementById('calendarGrid');
const currentMonthEl = document.getElementById('currentMonth');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const todayBtn = document.getElementById('todayBtn');
const yesterdayBtn = document.getElementById('yesterdayBtn');
const tomorrowBtn = document.getElementById('tomorrowBtn');
const modalOverlay = document.getElementById('modalOverlay');
const modalDate = document.getElementById('modalDate');
const taskForm = document.getElementById('taskForm');
const taskTime = document.getElementById('taskTime');
const taskContent = document.getElementById('taskContent');
const modalTaskList = document.getElementById('modalTaskList');
const todayTaskList = document.getElementById('todayTaskList');
const closeModalBtn = document.getElementById('closeModal');
const cancelBtn = document.getElementById('cancelBtn');
const notifBtn = document.getElementById('notifBtn');
const notifModalOverlay = document.getElementById('notifModalOverlay');
const closeNotifModal = document.getElementById('closeNotifModal');
const enableNotifBtn = document.getElementById('enableNotifBtn');
const testNotifBtn = document.getElementById('testNotifBtn');
const notifStatus = document.getElementById('notifStatus');
const notifBadge = document.getElementById('notifBadge');
const greeting = document.getElementById('greeting');
const subGreeting = document.getElementById('subGreeting');
const toast = document.getElementById('toast');
const darkModeBtn = document.getElementById('darkModeBtn');
const themeIcon = document.getElementById('themeIcon');
const taskDetailOverlay = document.getElementById('taskDetailOverlay');
const taskDetailTime = document.getElementById('taskDetailTime');
const taskDetailContent = document.getElementById('taskDetailContent');
const closeTaskDetail = document.getElementById('closeTaskDetail');
const inAppAlert = document.getElementById('inAppAlert');
const inAppAlertBody = document.getElementById('inAppAlertBody');
const closeInAppAlert = document.getElementById('closeInAppAlert');
const adPopupOverlay = document.getElementById('adPopupOverlay');
const closeAdPopup = document.getElementById('closeAdPopup');
const adDismissToday = document.getElementById('adDismissToday');
const listViewBtn = document.getElementById('listViewBtn');
const calendarViewBtn = document.getElementById('calendarViewBtn');
const taskViewPanel = document.getElementById('taskViewPanel');
const taskViewTitle = document.getElementById('taskViewTitle');
const taskViewNav = document.getElementById('taskViewNav');
const taskViewMonth = document.getElementById('taskViewMonth');
const taskViewContent = document.getElementById('taskViewContent');
const prevTaskViewMonth = document.getElementById('prevTaskViewMonth');
const nextTaskViewMonth = document.getElementById('nextTaskViewMonth');
const listFilterEl = document.getElementById('listFilter');
const dayListOverlay = document.getElementById('dayListOverlay');
const dayListTitle = document.getElementById('dayListTitle');
const dayListDate = document.getElementById('dayListDate');
const dayListTasks = document.getElementById('dayListTasks');
const closeDayList = document.getElementById('closeDayList');
const dayListAddBtn = document.getElementById('dayListAddBtn');

// ===== Greeting Messages =====
const greetings = [
  { main: '안녕! 나는 알리야 🐊', sub: '오늘도 함께 할일을 관리해볼까?' },
  { main: '화이팅! 알리가 응원해! 💪', sub: '하나씩 차근차근 해보자!' },
  { main: '오늘도 좋은 하루! ☀️', sub: '할일을 미리 정리하면 마음이 편해져!' },
  { main: '알리와 함께라면 OK! ✨', sub: '잊지 않게 알림도 설정해봐!' },
];

// ===== Dark Mode =====
function getPreferredTheme() {
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

function loadTheme() {
  if (!currentTheme) currentTheme = getPreferredTheme();
  return currentTheme;
}

function applyTheme(theme) {
  currentTheme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', currentTheme === 'dark' ? 'dark' : '');
  themeIcon.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
  const current = loadTheme();
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

// ===== In-Memory Data =====
function saveTasks() {
  // Tasks intentionally stay in memory only for the active page session.
}

function getDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getTaskTargetTime(dateKey, timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const target = parseDateKey(dateKey);
  target.setHours(hours, minutes, 0, 0);
  return target;
}

// ===== Calendar =====
function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  currentMonthEl.textContent = `${year}년 ${month + 1}월`;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = firstDay.getDay();
  const totalDays = lastDay.getDate();
  const todayKey = getDateKey(new Date());

  calendarGrid.innerHTML = '';

  const prevLastDay = new Date(year, month, 0).getDate();
  for (let i = startDay - 1; i >= 0; i--) {
    calendarGrid.appendChild(createDayCell(new Date(year, month - 1, prevLastDay - i), true, todayKey));
  }
  for (let day = 1; day <= totalDays; day++) {
    calendarGrid.appendChild(createDayCell(new Date(year, month, day), false, todayKey));
  }
  const remaining = 42 - (startDay + totalDays);
  for (let day = 1; day <= remaining; day++) {
    calendarGrid.appendChild(createDayCell(new Date(year, month + 1, day), true, todayKey));
  }

  renderTodayPreview();
  renderTaskView();
  refreshDayListModalIfOpen();
}

function createDayCell(date, isOtherMonth, todayKey) {
  const cell = document.createElement('div');
  cell.className = 'calendar-day';
  const dateKey = getDateKey(date);
  const dayOfWeek = date.getDay();

  if (isOtherMonth) cell.classList.add('other-month');
  if (dateKey === todayKey) cell.classList.add('today');
  if (dayOfWeek === 0) cell.classList.add('sun');
  if (dayOfWeek === 6) cell.classList.add('sat');

  const dayNumber = document.createElement('span');
  dayNumber.className = 'day-number';
  dayNumber.textContent = date.getDate();
  cell.appendChild(dayNumber);

  const dayTasks = tasks[dateKey] || [];
  if (dayTasks.length > 0) {
    const dots = document.createElement('div');
    dots.className = 'task-dots';
    for (let i = 0; i < Math.min(dayTasks.length, 3); i++) {
      const dot = document.createElement('span');
      dot.className = 'task-dot';
      dots.appendChild(dot);
    }
    cell.appendChild(dots);
  }

  cell.addEventListener('click', () => openModal(date));
  return cell;
}

// ===== Modal =====
function openModal(date) {
  selectedDate = date;
  modalDate.textContent = formatDateKorean(date);
  taskTime.value = '';
  taskContent.value = '';
  renderModalTasks(getDateKey(date));
  modalOverlay.hidden = false;
  taskContent.focus();
}

function closeModal() {
  modalOverlay.hidden = true;
  selectedDate = null;
}

function formatDateKorean(date) {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${days[date.getDay()]})`;
}

function renderModalTasks(dateKey) {
  const dayTasks = tasks[dateKey] || [];
  modalTaskList.innerHTML = '';

  if (dayTasks.length === 0) {
    modalTaskList.innerHTML = '<li class="empty-message">아직 할일이 없어요</li>';
    return;
  }

  dayTasks
    .sort((a, b) => a.time.localeCompare(b.time))
    .forEach((task) => {
      modalTaskList.appendChild(createTaskItem(task, dateKey, true));
    });
}

function renderTodayPreview() {
  const todayKey = getDateKey(new Date());
  const dayTasks = tasks[todayKey] || [];
  todayTaskList.innerHTML = '';

  if (dayTasks.length === 0) {
    todayTaskList.innerHTML = '<li class="empty-message">오늘 할일이 없어요. 달력을 눌러 추가해보세요!</li>';
    return;
  }

  dayTasks
    .sort((a, b) => a.time.localeCompare(b.time))
    .forEach((task) => {
      todayTaskList.appendChild(createTaskItem(task, todayKey, true));
    });
}

function createTaskItem(task, dateKey, truncate = false) {
  const li = document.createElement('li');
  li.className = 'task-item';
  if (task.completed) li.classList.add('completed');
  if (truncate) li.classList.add('clickable');

  li.innerHTML = `
    <span class="task-time">${task.time}</span>
    <span class="task-content">${escapeHtml(task.content)}</span>
    <div class="task-actions">
      <button class="task-btn complete" title="완료">${task.completed ? '↩' : '✓'}</button>
      <button class="task-btn delete" title="삭제">✕</button>
    </div>
  `;

  if (truncate) {
    li.querySelector('.task-content').addEventListener('click', (e) => {
      e.stopPropagation();
      openTaskDetail(task);
    });
    li.addEventListener('click', (e) => {
      if (!e.target.closest('.task-actions')) {
        openTaskDetail(task);
      }
    });
  }

  li.querySelector('.complete').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleComplete(dateKey, task.id);
  });

  li.querySelector('.delete').addEventListener('click', (e) => {
    e.stopPropagation();
    deleteTask(dateKey, task.id);
  });

  return li;
}

function openTaskDetail(task) {
  taskDetailTime.textContent = `⏰ ${task.time}`;
  taskDetailContent.textContent = task.content;
  taskDetailOverlay.hidden = false;
}

function closeTaskDetailModal() {
  taskDetailOverlay.hidden = true;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===== Task View (List / Calendar) =====
function setViewMode(mode) {
  currentViewMode = mode;
  listViewBtn.classList.toggle('active', mode === 'list');
  calendarViewBtn.classList.toggle('active', mode === 'calendar');
  taskViewPanel.hidden = false;
  taskViewNav.hidden = mode !== 'calendar';
  listFilterEl.hidden = mode !== 'list';
  updateListViewTitle();
  if (mode === 'calendar') {
    taskViewDate = new Date(currentDate);
  }
  renderTaskView();
}

function setListFilter(filter) {
  listFilter = filter;
  listFilterEl.querySelectorAll('.btn-filter').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  updateListViewTitle();
  if (currentViewMode === 'list') renderListView();
}

function updateListViewTitle() {
  if (currentViewMode !== 'list') {
    taskViewTitle.textContent = '할일 달력';
    return;
  }
  const titles = {
    all: '전체 할일 목록',
    completed: '완료된 할일',
    incomplete: '미완료 할일',
  };
  taskViewTitle.textContent = titles[listFilter] || titles.all;
}

function filterTaskEntries(entries) {
  if (listFilter === 'completed') {
    return entries.filter(({ task }) => task.completed);
  }
  if (listFilter === 'incomplete') {
    return entries.filter(({ task }) => !task.completed);
  }
  return entries;
}

function renderTaskView() {
  if (!currentViewMode) return;
  if (currentViewMode === 'list') {
    renderListView();
  } else {
    renderTaskCalendarView();
  }
}

function getAllTaskEntries() {
  return Object.entries(tasks)
    .flatMap(([dateKey, dayTasks]) =>
      dayTasks.map((task) => ({ dateKey, task }))
    )
    .sort((a, b) => {
      const dateCompare = a.dateKey.localeCompare(b.dateKey);
      if (dateCompare !== 0) return dateCompare;
      return a.task.time.localeCompare(b.task.time);
    });
}

function renderListView() {
  const entries = filterTaskEntries(getAllTaskEntries());
  taskViewContent.innerHTML = '';

  if (entries.length === 0) {
    const emptyMessages = {
      all: '등록된 할일이 없어요. 달력에서 추가해보세요!',
      completed: '완료된 할일이 없어요.',
      incomplete: '미완료 할일이 없어요.',
    };
    taskViewContent.innerHTML = `<p class="task-list-view-empty">${emptyMessages[listFilter]}</p>`;
    return;
  }

  const todayKey = getDateKey(new Date());
  let currentGroupKey = null;
  let groupEl = null;

  entries.forEach(({ dateKey, task }) => {
    if (dateKey !== currentGroupKey) {
      currentGroupKey = dateKey;
      groupEl = document.createElement('div');
      groupEl.className = 'list-view-group';

      const dateLabel = document.createElement('p');
      dateLabel.className = 'list-view-date';
      if (dateKey === todayKey) dateLabel.classList.add('today-date');
      dateLabel.textContent = formatDateKorean(parseDateKey(dateKey));
      groupEl.appendChild(dateLabel);

      const ul = document.createElement('ul');
      ul.className = 'task-list task-list-truncate';
      groupEl.appendChild(ul);
      taskViewContent.appendChild(groupEl);
    }

    const ul = groupEl.querySelector('.task-list');
    ul.appendChild(createTaskItem(task, dateKey, true));
  });
}

function renderTaskCalendarView() {
  const year = taskViewDate.getFullYear();
  const month = taskViewDate.getMonth();
  taskViewMonth.textContent = `${year}년 ${month + 1}월`;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = firstDay.getDay();
  const totalDays = lastDay.getDate();
  const todayKey = getDateKey(new Date());

  taskViewContent.innerHTML = '';

  const weekdays = document.createElement('div');
  weekdays.className = 'task-calendar-weekdays';
  weekdays.innerHTML = `
    <span class="sun">일</span><span>월</span><span>화</span><span>수</span>
    <span>목</span><span>금</span><span class="sat">토</span>
  `;
  taskViewContent.appendChild(weekdays);

  const grid = document.createElement('div');
  grid.className = 'task-calendar-grid';

  const prevLastDay = new Date(year, month, 0).getDate();
  for (let i = startDay - 1; i >= 0; i--) {
    grid.appendChild(createTaskCalendarDay(new Date(year, month - 1, prevLastDay - i), true, todayKey));
  }
  for (let day = 1; day <= totalDays; day++) {
    grid.appendChild(createTaskCalendarDay(new Date(year, month, day), false, todayKey));
  }
  const remaining = 42 - (startDay + totalDays);
  for (let day = 1; day <= remaining; day++) {
    grid.appendChild(createTaskCalendarDay(new Date(year, month + 1, day), true, todayKey));
  }

  taskViewContent.appendChild(grid);
}

function createTaskCalendarDay(date, isOtherMonth, todayKey) {
  const cell = document.createElement('div');
  cell.className = 'task-calendar-day';
  const dateKey = getDateKey(date);
  const dayOfWeek = date.getDay();

  if (isOtherMonth) cell.classList.add('other-month');
  if (dateKey === todayKey) cell.classList.add('today');
  if (dayOfWeek === 0) cell.classList.add('sun');
  if (dayOfWeek === 6) cell.classList.add('sat');

  const header = document.createElement('div');
  header.className = 'task-calendar-day-header';
  header.textContent = date.getDate();
  header.title = '할일 목록 보기';
  header.addEventListener('click', (e) => {
    e.stopPropagation();
    openDayListModal(date);
  });
  cell.appendChild(header);

  const tasksContainer = document.createElement('div');
  tasksContainer.className = 'task-calendar-day-tasks';

  const dayTasks = (tasks[dateKey] || []).sort((a, b) => a.time.localeCompare(b.time));

  if (dayTasks.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'task-calendar-empty';
    empty.textContent = '-';
    tasksContainer.appendChild(empty);
  } else {
    dayTasks.forEach((task) => {
      const item = document.createElement('div');
      item.className = 'task-calendar-item';
      if (task.completed) item.classList.add('completed');
      item.innerHTML = `
        <span class="item-time">${task.time}</span>
        <span class="item-content">${escapeHtml(task.content)}</span>
      `;
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        openTaskDetail(task);
      });
      tasksContainer.appendChild(item);
    });
  }

  cell.appendChild(tasksContainer);

  const addWrap = document.createElement('div');
  addWrap.className = 'task-calendar-add';
  const addBtn = document.createElement('button');
  addBtn.className = 'task-calendar-add-btn';
  addBtn.textContent = '+ 추가';
  addBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openModal(date);
  });
  addWrap.appendChild(addBtn);
  cell.appendChild(addWrap);

  return cell;
}

function openDayListModal(date) {
  dayListViewDate = date;
  const dateKey = getDateKey(date);
  dayListTitle.textContent = `${date.getDate()}일 할일`;
  dayListDate.textContent = formatDateKorean(date);
  renderDayListModal(dateKey);
  dayListOverlay.hidden = false;
}

function closeDayListModal() {
  dayListOverlay.hidden = true;
  dayListViewDate = null;
}

function renderDayListModal(dateKey) {
  const dayTasks = tasks[dateKey] || [];
  dayListTasks.innerHTML = '';

  if (dayTasks.length === 0) {
    dayListTasks.innerHTML = '<li class="empty-message">이 날 등록된 할일이 없어요</li>';
    return;
  }

  dayTasks
    .sort((a, b) => a.time.localeCompare(b.time))
    .forEach((task) => {
      dayListTasks.appendChild(createTaskItem(task, dateKey, false));
    });
}

function refreshDayListModalIfOpen() {
  if (dayListViewDate && !dayListOverlay.hidden) {
    renderDayListModal(getDateKey(dayListViewDate));
  }
}

// ===== Task CRUD =====
function addTask(dateKey, time, content) {
  if (!tasks[dateKey]) tasks[dateKey] = [];

  const task = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    time,
    content,
    completed: false,
    notified: false,
    createdAt: Date.now(),
  };

  tasks[dateKey].push(task);
  saveTasks();
  scheduleNotification(dateKey, task);
  renderCalendar();

  if (selectedDate && getDateKey(selectedDate) === dateKey) {
    renderModalTasks(dateKey);
  }

  showToast('할일이 저장되었어요! 🐊');
}

function toggleComplete(dateKey, taskId) {
  const task = tasks[dateKey]?.find((t) => t.id === taskId);
  if (task) {
    task.completed = !task.completed;
    saveTasks();
    renderCalendar();
    if (selectedDate && getDateKey(selectedDate) === dateKey) {
      renderModalTasks(dateKey);
    }
  }
}

function deleteTask(dateKey, taskId) {
  if (!tasks[dateKey]) return;
  cancelNotification(taskId);
  tasks[dateKey] = tasks[dateKey].filter((t) => t.id !== taskId);
  if (tasks[dateKey].length === 0) delete tasks[dateKey];
  saveTasks();
  renderCalendar();
  if (selectedDate && getDateKey(selectedDate) === dateKey) {
    renderModalTasks(dateKey);
  }
  showToast('할일이 삭제되었어요');
}

// ===== Notifications (개선) =====
function isNotificationSupported() {
  return 'Notification' in window;
}

function requestNotificationPermission() {
  if (!isNotificationSupported()) {
    notifStatus.textContent = '이 브라우저는 알림을 지원하지 않아요.';
    notifStatus.className = 'notif-status denied';
    enableNotifBtn.hidden = true;
    return;
  }

  Notification.requestPermission().then((permission) => {
    updateNotifStatus(permission);
    if (permission === 'granted') {
      scheduleAllNotifications();
      showToast('알림이 설정되었어요! 🔔');
    }
  });
}

function updateNotifStatus(permission) {
  if (permission === 'granted') {
    notifStatus.textContent = '✅ 알림이 허용되었어요!';
    notifStatus.className = 'notif-status granted';
    enableNotifBtn.textContent = '알림 허용됨';
    enableNotifBtn.disabled = true;
    testNotifBtn.hidden = false;
    notifBadge.hidden = true;
  } else if (permission === 'denied') {
    notifStatus.textContent = '❌ 알림이 차단되었어요. 브라우저 설정에서 허용해주세요.';
    notifStatus.className = 'notif-status denied';
    enableNotifBtn.hidden = true;
    testNotifBtn.hidden = true;
    notifBadge.hidden = false;
  } else {
    notifStatus.textContent = '알림 권한을 허용해주세요.';
    notifStatus.className = 'notif-status';
    enableNotifBtn.hidden = false;
    enableNotifBtn.disabled = false;
    enableNotifBtn.textContent = '알림 허용하기';
    testNotifBtn.hidden = true;
    notifBadge.hidden = false;
  }
}

function sendTestNotification() {
  if (Notification.permission !== 'granted') {
    showToast('먼저 알림 권한을 허용해주세요');
    return;
  }
  triggerAlert('🐊 테스트 알림', '알리 할일 알림이 정상 작동합니다!', null, true);
  showToast('테스트 알림을 보냈어요!');
}

function scheduleNotification(dateKey, task) {
  if (task.completed || task.notified) return;

  const targetDate = getTaskTargetTime(dateKey, task.time);
  const delay = targetDate.getTime() - Date.now();
  if (delay <= 0) return;

  cancelNotification(task.id);

  if (delay <= MAX_SETTIMEOUT_DELAY) {
    const timerId = setTimeout(() => {
      checkAndFireNotification(dateKey, task.id);
    }, delay);
    notificationTimers.set(task.id, timerId);
  }
}

function checkAndFireNotification(dateKey, taskId) {
  const task = tasks[dateKey]?.find((t) => t.id === taskId);
  if (!task || task.completed || task.notified) return;

  const targetDate = getTaskTargetTime(dateKey, task.time);
  const now = Date.now();

  if (now >= targetDate.getTime()) {
    fireNotification(task, dateKey);
  }
}

function fireNotification(task, dateKey) {
  if (task.notified || task.completed) return;

  task.notified = true;
  saveTasks();
  cancelNotification(task.id);

  const title = '🐊 알리 할일 알림';
  const body = `${task.time} - ${task.content}`;

  triggerAlert(title, body, dateKey);

  greeting.textContent = '알림 시간이야! 🔔';
  subGreeting.textContent = `"${task.content}" 잊지 않았지?`;
}

function triggerAlert(title, body, dateKey, isTest = false) {
  playNotificationSound();

  if (document.visibilityState === 'visible') {
    showInAppAlert(title, body);
  }

  if (isNotificationSupported() && Notification.permission === 'granted') {
    try {
      const notification = new Notification(title, {
        body,
        icon: createNotificationIcon(),
        tag: isTest ? 'test-' + Date.now() : 'task-' + Date.now(),
        requireInteraction: true,
      });

      notification.onclick = () => {
        window.focus();
        if (dateKey) openModal(parseDateKey(dateKey));
        notification.close();
      };
    } catch (err) {
      console.warn('브라우저 알림 전송 실패:', err);
      showInAppAlert(title, body);
    }
  } else {
    showInAppAlert(title, body);
  }

  showToast(`🔔 ${body}`);
}

function showInAppAlert(title, body) {
  document.getElementById('inAppAlertTitle').textContent = title;
  inAppAlertBody.textContent = body;
  inAppAlert.hidden = false;
}

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);

    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 1100;
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0.3, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc2.start(ctx.currentTime);
      osc2.stop(ctx.currentTime + 0.5);
    }, 200);
  } catch {
    // Audio not available
  }
}

function createNotificationIcon() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#4caf50';
  ctx.beginPath();
  ctx.arc(32, 32, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(24, 26, 6, 0, Math.PI * 2);
  ctx.arc(40, 26, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1b5e20';
  ctx.beginPath();
  ctx.arc(25, 27, 2.5, 0, Math.PI * 2);
  ctx.arc(41, 27, 2.5, 0, Math.PI * 2);
  ctx.fill();
  return canvas.toDataURL();
}

function cancelNotification(taskId) {
  const timerId = notificationTimers.get(taskId);
  if (timerId) {
    clearTimeout(timerId);
    notificationTimers.delete(taskId);
  }
}

function scheduleAllNotifications() {
  notificationTimers.forEach((_, id) => cancelNotification(id));
  Object.entries(tasks).forEach(([dateKey, dayTasks]) => {
    dayTasks.forEach((task) => scheduleNotification(dateKey, task));
  });
}

function checkDueNotifications() {
  const now = Date.now();

  Object.entries(tasks).forEach(([dateKey, dayTasks]) => {
    dayTasks.forEach((task) => {
      if (task.notified || task.completed) return;

      const targetDate = getTaskTargetTime(dateKey, task.time);
      const diff = now - targetDate.getTime();

      if (diff >= 0 && diff < 60000) {
        fireNotification(task, dateKey);
      }
    });
  });
}

// ===== Popup Ad =====
function shouldShowAdPopup() {
  return dismissedAdDate !== getDateKey(new Date());
}

function showAdPopup() {
  if (!shouldShowAdPopup()) return;
  adPopupOverlay.hidden = false;
}

function closeAdPopupModal() {
  adPopupOverlay.hidden = true;
  if (adDismissToday.checked) {
    dismissedAdDate = getDateKey(new Date());
  }
}

// ===== Toast =====
function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => { toast.hidden = true; }, 2500);
}

function setRandomGreeting() {
  const msg = greetings[Math.floor(Math.random() * greetings.length)];
  greeting.textContent = msg.main;
  subGreeting.textContent = msg.sub;
}

// ===== Event Listeners =====
prevMonthBtn.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
});

nextMonthBtn.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
});

todayBtn.addEventListener('click', () => {
  currentDate = new Date();
  renderCalendar();
});

yesterdayBtn.addEventListener('click', () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  currentDate = date;
  renderCalendar();
});

tomorrowBtn.addEventListener('click', () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  currentDate = date;
  renderCalendar();
});

closeModalBtn.addEventListener('click', closeModal);
cancelBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

closeTaskDetail.addEventListener('click', closeTaskDetailModal);
taskDetailOverlay.addEventListener('click', (e) => {
  if (e.target === taskDetailOverlay) closeTaskDetailModal();
});

taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!selectedDate) return;
  const dateKey = getDateKey(selectedDate);
  const time = taskTime.value;
  const content = taskContent.value.trim();
  if (!time || !content) return;
  addTask(dateKey, time, content);
  taskTime.value = '';
  taskContent.value = '';
});

darkModeBtn.addEventListener('click', toggleTheme);

notifBtn.addEventListener('click', () => {
  notifModalOverlay.hidden = false;
  if (isNotificationSupported()) updateNotifStatus(Notification.permission);
});

closeNotifModal.addEventListener('click', () => { notifModalOverlay.hidden = true; });
notifModalOverlay.addEventListener('click', (e) => {
  if (e.target === notifModalOverlay) notifModalOverlay.hidden = true;
});

enableNotifBtn.addEventListener('click', requestNotificationPermission);
testNotifBtn.addEventListener('click', sendTestNotification);
closeInAppAlert.addEventListener('click', () => { inAppAlert.hidden = true; });

closeAdPopup.addEventListener('click', closeAdPopupModal);
adPopupOverlay.addEventListener('click', (e) => {
  if (e.target === adPopupOverlay) closeAdPopupModal();
});

listViewBtn.addEventListener('click', () => setViewMode('list'));
calendarViewBtn.addEventListener('click', () => setViewMode('calendar'));

listFilterEl.querySelectorAll('.btn-filter').forEach((btn) => {
  btn.addEventListener('click', () => setListFilter(btn.dataset.filter));
});

prevTaskViewMonth.addEventListener('click', () => {
  taskViewDate.setMonth(taskViewDate.getMonth() - 1);
  renderTaskCalendarView();
});

nextTaskViewMonth.addEventListener('click', () => {
  taskViewDate.setMonth(taskViewDate.getMonth() + 1);
  renderTaskCalendarView();
});

closeDayList.addEventListener('click', closeDayListModal);
dayListOverlay.addEventListener('click', (e) => {
  if (e.target === dayListOverlay) closeDayListModal();
});

dayListAddBtn.addEventListener('click', () => {
  if (!dayListViewDate) return;
  const date = new Date(dayListViewDate);
  closeDayListModal();
  openModal(date);
});

// ===== Init =====
function init() {
  applyTheme(loadTheme());
  setRandomGreeting();
  renderCalendar();

  if (isNotificationSupported()) {
    updateNotifStatus(Notification.permission);
    if (Notification.permission === 'granted') {
      scheduleAllNotifications();
    } else if (Notification.permission === 'default') {
      setTimeout(() => { notifModalOverlay.hidden = false; }, 1500);
    }
  }

  setInterval(checkDueNotifications, NOTIF_CHECK_INTERVAL);
  checkDueNotifications();

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      checkDueNotifications();
      scheduleAllNotifications();
    }
  });

  setTimeout(showAdPopup, 2000);
}

init();
