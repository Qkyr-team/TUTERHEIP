document.addEventListener("DOMContentLoaded", () => {
    initTeacherDashboard();
});


/* =========================================
   INIT
========================================= */

function initTeacherDashboard() {
    setDashboardDate();
    loadDashboardData();
    initDashboardPeriod();
}


/* =========================================
   DATE
========================================= */

function setDashboardDate() {
    const dateElement = document.getElementById("dashboardDate");

    if (!dateElement) return;

    const now = new Date();

    const formattedDate = now.toLocaleDateString("ru-RU", {
        weekday: "long",
        day: "numeric",
        month: "long"
    });

    dateElement.textContent =
        formattedDate.charAt(0).toUpperCase() +
        formattedDate.slice(1);
}


/* =========================================
   LOAD DATA
========================================= */

async function loadDashboardData() {
    try {
        /*
         * Здесь подключается существующий Backend TutorHelp.
         *
         * Пока не знаем точные endpoint'ы,
         * поэтому Dashboard не делает
         * предположений о Backend.
         */

        await loadDashboardStatistics();
        await loadDashboardStudents();
        await loadDashboardResults();
        await loadDashboardUpcoming();

    } catch (error) {
        console.error(
            "Ошибка загрузки Dashboard:",
            error
        );
    }
}


/* =========================================
   STATISTICS
========================================= */

async function loadDashboardStatistics() {

    /*
     * В дальнейшем здесь будут реальные данные:
     *
     * students
     * codes
     * results
     * certificates
     *
     * Например:
     *
     * const response = await fetch("/api/teacher/dashboard");
     * const data = await response.json();
     */

    setDashboardValue(
        "dashboardStudentsCount",
        0
    );

    setDashboardValue(
        "dashboardCodesCount",
        0
    );

    setDashboardValue(
        "dashboardResultsCount",
        0
    );

    setDashboardValue(
        "dashboardCertificatesCount",
        0
    );
}


/* =========================================
   STUDENTS
========================================= */

async function loadDashboardStudents() {

    const container =
        document.getElementById(
            "dashboardRecentStudents"
        );

    if (!container) return;

    /*
     * Здесь позже будет загрузка
     * реальных учеников текущего репетитора.
     */

    renderDashboardEmpty(
        container,
        "🎓",
        "Ученики появятся здесь"
    );
}


/* =========================================
   RESULTS
========================================= */

async function loadDashboardResults() {

    const container =
        document.getElementById(
            "dashboardRecentResults"
        );

    if (!container) return;

    /*
     * Здесь позже будут отображаться
     * последние результаты учеников.
     */

    renderDashboardEmpty(
        container,
        "📊",
        "Результаты появятся здесь"
    );
}


/* =========================================
   UPCOMING EVENTS
========================================= */

async function loadDashboardUpcoming() {

    const container =
        document.getElementById(
            "dashboardUpcoming"
        );

    if (!container) return;

    /*
     * Здесь позже подключим расписание
     * и ближайшие события.
     */

    renderDashboardEmpty(
        container,
        "📅",
        "Пока нет запланированных событий"
    );
}


/* =========================================
   ACTIVITY PERIOD
========================================= */

function initDashboardPeriod() {

    const select =
        document.getElementById(
            "dashboardActivityPeriod"
        );

    if (!select) return;

    select.addEventListener(
        "change",
        () => {
            const period = select.value;

            loadDashboardActivity(period);
        }
    );

    loadDashboardActivity(select.value);
}


async function loadDashboardActivity(period) {

    const chart =
        document.getElementById(
            "dashboardActivityChart"
        );

    if (!chart) return;

    /*
     * Здесь позже появится настоящий график.
     *
     * period:
     * 7  = последние 7 дней
     * 30 = последние 30 дней
     */

    chart.innerHTML = `
        <div class="dashboard-empty">
            <span>📈</span>
            <p>
                Статистика за последние ${period} дней
            </p>
        </div>
    `;
}


/* =========================================
   HELPERS
========================================= */

function setDashboardValue(
    elementId,
    value
) {
    const element =
        document.getElementById(elementId);

    if (!element) return;

    element.textContent = value;
}


function renderDashboardEmpty(
    container,
    icon,
    message
) {
    container.innerHTML = `
        <div class="dashboard-empty">
            <span>${icon}</span>
            <p>${message}</p>
        </div>
    `;
}


/* =========================================
   REFRESH
========================================= */

async function refreshTeacherDashboard() {
    await loadDashboardData();
}


/* =========================================
   EXPORT
========================================= */

window.initTeacherDashboard =
    initTeacherDashboard;

window.refreshTeacherDashboard =
    refreshTeacherDashboard;