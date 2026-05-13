
const App = {
    exams: [],
    lessons: [],
    selectedDay: new Date().getDay(), // 0-6 (Pazar-Cumartesi)

    async init() {
        this.cacheDOM();
        this.loadData();
        this.bindEvents();
        this.render();
        this.startTimers();
    },

    cacheDOM() {
        // Forms
        this.examForm = document.getElementById('exam-form');
        this.lessonForm = document.getElementById('lesson-form');

        // Containers
        this.examsContainer = document.getElementById('exams-container');
        this.lessonsContainer = document.getElementById('lessons-container');

        // Nav
        this.views = document.querySelectorAll('.view');
        this.navItems = document.querySelectorAll('.nav-item');

        // Lesson specific
        this.dayBtns = document.querySelectorAll('.day-btn');
        this.dayLabel = document.getElementById('current-day-label');
        this.fabAddLesson = document.getElementById('fab-add-lesson');
        this.btnCancelLesson = document.getElementById('cancel-lesson');
    },

    bindEvents() {
        // Form submissions
        this.examForm.addEventListener('submit', (e) => this.handleAddExam(e));
        this.lessonForm.addEventListener('submit', (e) => this.handleAddLesson(e));

        // Delete events
        this.examsContainer.addEventListener('click', (e) => this.handleDeleteExam(e));
        this.lessonsContainer.addEventListener('click', (e) => this.handleDeleteLesson(e));

        // View switching
        this.navItems.forEach(item => {
            item.addEventListener('click', () => this.switchView(item.dataset.view));
        });

        // Day selection
        this.dayBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectedDay = parseInt(btn.dataset.day);
                this.updateDayUI();
                this.renderLessons();
            });
        });

        // FAB & Cancel
        if (this.fabAddLesson) {
            this.fabAddLesson.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('FAB Clicked');
                const daySelect = document.getElementById('lesson-day');
                if (daySelect) daySelect.value = this.selectedDay;
                this.switchView('add-lesson-view');
            });
        }

        if (this.btnCancelLesson) {
            this.btnCancelLesson.addEventListener('click', () => {
                this.switchView('lessons-view');
            });
        }

        this.initScrollHiding();
    },

    initScrollHiding() {
        const nav = document.querySelector('.bottom-nav');
        window.addEventListener('scroll', () => {
            if (window.scrollY > 20) {
                nav.classList.add('nav-hidden');
            } else {
                nav.classList.remove('nav-hidden');
            }
        }, { passive: true });
    },

    switchView(viewId) {
        this.views.forEach(view => {
            view.classList.toggle('active', view.id === viewId);
        });

        this.navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.view === viewId);
        });

        // Show/Hide FAB based on view
        const fab = document.getElementById('fab-add-lesson');
        if (fab) {
            fab.style.display = (viewId === 'lessons-view') ? 'flex' : 'none';
        }

        if (viewId === 'list-view') this.renderExams();
        if (viewId === 'lessons-view') this.renderLessons();
    },

    loadData() {
        // Exams
        const savedExams = localStorage.getItem('exam_calendar_main');
        this.exams = savedExams ? JSON.parse(savedExams) : [];

        // Lessons
        const savedLessons = localStorage.getItem('lesson_calendar_data');
        this.lessons = savedLessons ? JSON.parse(savedLessons) : [];

        this.updateDayUI();
    },

    saveExams() {
        localStorage.setItem('exam_calendar_main', JSON.stringify(this.exams));
        this.updateBadge();
    },

    saveLessons() {
        localStorage.setItem('lesson_calendar_data', JSON.stringify(this.lessons));
    },

    updateBadge() {
        const badge = document.getElementById('exam-count');
        if (badge) badge.textContent = `${this.exams.length} Sınav`;
    },

    updateDayUI() {
        const dayNames = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
        this.dayLabel.textContent = dayNames[this.selectedDay];

        this.dayBtns.forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.day) === this.selectedDay);
        });
    },

    // --- Exam Methods ---

    renderExams() {
        if (this.exams.length === 0) {
            this.examsContainer.innerHTML = '<div class="empty-state"><p>Henüz eklenmiş bir sınav bulunmuyor.</p></div>';
            return;
        }

        this.exams.sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
        this.examsContainer.innerHTML = '';
        this.exams.forEach(exam => {
            const card = this.createExamCard(exam);
            this.examsContainer.appendChild(card);
        });
        this.updateBadge();
    },

    createExamCard(exam) {
        const examDate = new Date(`${exam.date}T${exam.time}`);
        const countdown = this.calculateCountdown(examDate);

        const card = document.createElement('div');
        card.className = `exam-card ${countdown.status === 'urgent' ? 'urgent' : ''} ${countdown.status === 'passed' ? 'passed' : ''}`;

        const formattedDate = new Intl.DateTimeFormat('tr-TR', {
            day: 'numeric', month: 'long', year: 'numeric'
        }).format(examDate);

        let countdownHTML = '';
        if (countdown.status === 'passed') {
            countdownHTML = `<div class="status-label status-passed">Sınav Geçti</div>`;
        } else if (countdown.status === 'ongoing') {
            countdownHTML = `<div class="status-label status-ongoing">Sınavınız Başladı!</div>`;
        } else {
            countdownHTML = `
                <div class="countdown-container">
                    <div class="countdown-box"><span class="countdown-value">${countdown.days}</span><span class="countdown-label">Gün</span></div>
                    <div class="countdown-box"><span class="countdown-value">${countdown.hours}</span><span class="countdown-label">Saat</span></div>
                    <div class="countdown-box"><span class="countdown-value">${countdown.minutes}</span><span class="countdown-label">Dak</span></div>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="exam-header">
                <div class="exam-info">
                    <h3>${exam.name}</h3>
                    <div class="exam-date-time">
                        <span>📅 ${formattedDate}</span>
                        <span>⏰ ${exam.time}</span>
                    </div>
                </div>
                <button class="btn-delete" data-id="${exam.id}" title="Sil">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                </button>
            </div>
            ${countdownHTML}
        `;
        return card;
    },

    calculateCountdown(targetDate) {
        const now = new Date().getTime();
        const distance = targetDate - now;
        if (distance < 0) return { status: distance > -7200000 ? 'ongoing' : 'passed' };

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

        return { days, hours, minutes, status: days < 2 ? 'urgent' : 'upcoming' };
    },

    handleAddExam(e) {
        e.preventDefault();
        const newExam = {
            id: Date.now(),
            name: document.getElementById('exam-name').value,
            date: document.getElementById('exam-date').value,
            time: document.getElementById('exam-time').value,
            createdAt: new Date().toISOString()
        };
        this.exams.push(newExam);
        this.saveExams();
        this.renderExams();
        this.examForm.reset();
        this.switchView('list-view');
    },

    handleDeleteExam(e) {
        const btn = e.target.closest('.btn-delete');
        if (!btn) return;
        this.exams = this.exams.filter(ex => ex.id !== parseInt(btn.dataset.id));
        this.saveExams();
        this.renderExams();
    },

    // --- Lesson Methods ---

    renderLessons() {
        const dayLessons = this.lessons.filter(l => l.day === this.selectedDay);
        dayLessons.sort((a, b) => a.start.localeCompare(b.start));

        if (dayLessons.length === 0) {
            this.lessonsContainer.innerHTML = '<div class="empty-state"><p>Bu gün için ders programı boş.</p></div>';
            return;
        }

        this.lessonsContainer.innerHTML = '';
        dayLessons.forEach(lesson => {
            const card = this.createLessonCard(lesson);
            this.lessonsContainer.appendChild(card);
        });
    },

    createLessonCard(lesson) {
        const isActive = this.isLessonActive(lesson);
        const card = document.createElement('div');
        card.className = `lesson-card ${isActive ? 'active' : ''}`;

        card.innerHTML = `
            <div class="lesson-time-column">
                <span class="lesson-time-start">${lesson.start}</span>
                <span class="lesson-time-end">${lesson.end}</span>
            </div>
            <div class="lesson-content">
                <h3 class="lesson-name">${lesson.name}</h3>
                <div class="lesson-details">
                    <div class="lesson-detail-item">📍 <span>${lesson.room || '-'}</span></div>
                    <div class="lesson-detail-item">👤 <span>${lesson.teacher || '-'}</span></div>
                </div>
            </div>
            <div class="lesson-actions">
                <button class="btn-delete" data-id="${lesson.id}" title="Sil">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                </button>
            </div>
        `;
        return card;
    },

    isLessonActive(lesson) {
        const now = new Date();
        const currentDay = now.getDay();
        if (currentDay !== lesson.day) return false;

        const currentTime = now.getHours() * 60 + now.getMinutes();
        const [startH, startM] = lesson.start.split(':').map(Number);
        const [endH, endM] = lesson.end.split(':').map(Number);
        const startTime = startH * 60 + startM;
        const endTime = endH * 60 + endM;

        return currentTime >= startTime && currentTime < endTime;
    },

    handleAddLesson(e) {
        e.preventDefault();
        const newLesson = {
            id: Date.now(),
            name: document.getElementById('lesson-name').value,
            day: parseInt(document.getElementById('lesson-day').value),
            start: document.getElementById('lesson-start').value,
            end: document.getElementById('lesson-end').value,
            room: document.getElementById('lesson-room').value,
            teacher: document.getElementById('lesson-teacher').value
        };

        this.lessons.push(newLesson);
        this.saveLessons();
        this.renderLessons();
        this.lessonForm.reset();
        this.switchView('lessons-view');
    },

    handleDeleteLesson(e) {
        const btn = e.target.closest('.btn-delete');
        if (!btn) return;
        this.lessons = this.lessons.filter(l => l.id !== parseInt(btn.dataset.id));
        this.saveLessons();
        this.renderLessons();
    },

    // --- Common ---

    render() {
        this.renderExams();
        this.renderLessons();
    },

    startTimers() {
        setInterval(() => this.render(), 60000); // Her dakika güncelle
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());

