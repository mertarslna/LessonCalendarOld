const DEFAULT_EXAMS = [
    { id: 101, name: "Medeni Usul Hukuku", date: "2026-05-16", time: "16:00" },
    { id: 102, name: "Şirketler Hukuku", date: "2026-05-17", time: "10:00" },
    { id: 103, name: "Ceza Hukuku (Özel)", date: "2026-05-18", time: "15:00" },
    { id: 104, name: "Borçlar Hukuku (Özel)", date: "2026-05-20", time: "15:00" },
    { id: 105, name: "KKTC Şahadet Hukuku", date: "2026-05-21", time: "13:00" },
    { id: 106, name: "Eşya Hukuku", date: "2026-05-22", time: "17:00" },
    { id: 107, name: "Hukuk Sosyolojisi", date: "2026-05-23", time: "14:00" },
    { id: 108, name: "Antalya Yolculuğu", date: "2026-05-26", time: "13:40" },
    { id: 109, name: "Fikri Sinai Mülkiyet", date: "2026-05-24", time: "00:00" },
    { id: 110, name: "Deneme Hukuku", date: "2026-05-25", time: "00:00" },
];

const ExamApp = {
    exams: [],

    async init() {
        this.cacheDOM();
        this.loadExams();
        this.bindEvents();
        this.render();
        this.startTimers();
    },

    cacheDOM() {
        this.form = document.getElementById('exam-form');
        this.nameInput = document.getElementById('exam-name');
        this.dateInput = document.getElementById('exam-date');
        this.timeInput = document.getElementById('exam-time');
        this.container = document.getElementById('exams-container');
        this.countBadge = document.getElementById('exam-count');
        this.noExamsMsg = document.getElementById('no-exams');

        // Navigation
        this.views = document.querySelectorAll('.view');
        this.navItems = document.querySelectorAll('.nav-item');
    },

    bindEvents() {
        this.form.addEventListener('submit', (e) => this.handleAddExam(e));
        this.container.addEventListener('click', (e) => this.handleDelete(e));

        // View switching
        this.navItems.forEach(item => {
            item.addEventListener('click', () => this.switchView(item.dataset.view));
        });

        // Scroll hiding logic for bottom nav
        this.initScrollHiding();
    },

    initScrollHiding() {
        const nav = document.querySelector('.bottom-nav');

        window.addEventListener('scroll', () => {
            if (window.scrollY > 20) {
                // Not at the top
                nav.classList.add('nav-hidden');
            } else {
                // At the top
                nav.classList.remove('nav-hidden');
            }
        }, { passive: true });
    },

    switchView(viewId) {
        // Update views
        this.views.forEach(view => {
            view.classList.toggle('active', view.id === viewId);
        });

        // Update nav items
        this.navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.view === viewId);
        });

        // If switching to list, re-render to update countdowns
        if (viewId === 'list-view') {
            this.render();
        }
    },

    loadExams() {
        // Stable key for long-term use
        const STORAGE_KEY = 'exam_calendar_main';
        const saved = localStorage.getItem(STORAGE_KEY);
        let localExams = saved ? JSON.parse(saved) : [];

        // Always check for missing default exams and add them
        let updated = false;
        DEFAULT_EXAMS.forEach(defExam => {
            const exists = localExams.some(local => local.id === defExam.id);
            if (!exists) {
                localExams.push({
                    ...defExam,
                    createdAt: new Date().toISOString()
                });
                updated = true;
            }
        });

        this.exams = localExams;
        this.sortExams();

        // Only save if we actually updated something or it was empty
        if (updated || !saved) {
            this.saveExams();
        }
    },

    saveExams() {
        localStorage.setItem('exam_calendar_main', JSON.stringify(this.exams));
        this.updateBadge();
    },

    sortExams() {
        this.exams.sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
    },

    handleAddExam(e) {
        e.preventDefault();

        const newExam = {
            id: Date.now(),
            name: this.nameInput.value,
            date: this.dateInput.value,
            time: this.timeInput.value,
            createdAt: new Date().toISOString()
        };

        this.exams.push(newExam);
        this.sortExams();
        this.saveExams();
        this.render();
        this.form.reset();

        // Return to list view
        this.switchView('list-view');
    },

    handleDelete(e) {
        const deleteBtn = e.target.closest('.btn-delete');
        if (!deleteBtn) return;

        const id = parseInt(deleteBtn.dataset.id);
        this.exams = this.exams.filter(exam => exam.id !== id);
        this.saveExams();
        this.render();
    },

    updateBadge() {
        if (this.countBadge) {
            this.countBadge.textContent = `${this.exams.length} Sınav`;
        }
    },

    calculateCountdown(targetDate) {
        const now = new Date().getTime();
        const distance = targetDate - now;

        if (distance < 0) {
            // Check if it was within the last 2 hours (assuming exam duration)
            if (distance > -7200000) {
                return { status: 'ongoing' };
            }
            return { status: 'passed' };
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        return {
            days, hours, minutes, seconds,
            status: days < 2 ? 'urgent' : 'upcoming'
        };
    },

    render() {
        if (this.exams.length === 0) {
            this.container.innerHTML = '';
            this.container.appendChild(this.noExamsMsg);
            this.updateBadge();
            return;
        }

        this.container.innerHTML = '';
        this.exams.forEach(exam => {
            const card = this.createExamCard(exam);
            this.container.appendChild(card);
        });

        this.updateBadge();
    },

    createExamCard(exam) {
        const examDate = new Date(`${exam.date}T${exam.time}`);
        const countdown = this.calculateCountdown(examDate);

        const card = document.createElement('div');
        card.className = `exam-card ${countdown.status === 'urgent' ? 'urgent' : ''} ${countdown.status === 'passed' ? 'passed' : ''}`;
        card.dataset.id = exam.id;

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
                    <div class="countdown-box">
                        <span class="countdown-value">${countdown.days}</span>
                        <span class="countdown-label">Gün</span>
                    </div>
                    <div class="countdown-box">
                        <span class="countdown-value">${countdown.hours}</span>
                        <span class="countdown-label">Saat</span>
                    </div>
                    <div class="countdown-box">
                        <span class="countdown-value">${countdown.minutes}</span>
                        <span class="countdown-label">Dak</span>
                    </div>
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

    startTimers() {
        // Update every minute to keep it efficient, or every second if we show seconds
        // For this design, minutes is enough as per requirements (gün, saat, dakika)
        setInterval(() => {
            this.render();
        }, 60000);
    }
};

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    ExamApp.init();
});
