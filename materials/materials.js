/* =================================
   TUTORHELP — MATERIALS
================================= */

const DB_NAME = 'TutorHelpMaterialsDB';
const DB_VERSION = 1;
const STORE_NAME = 'materials';

let db = null;
let currentCategory = 'all';
let currentSearch = '';


/* =================================
   DATABASE
================================= */

function openDatabase() {

    return new Promise((resolve, reject) => {

        const request = indexedDB.open(
            DB_NAME,
            DB_VERSION
        );

        request.onupgradeneeded = (event) => {

            const database = event.target.result;

            if (!database.objectStoreNames.contains(STORE_NAME)) {

                database.createObjectStore(
                    STORE_NAME,
                    {
                        keyPath: 'id'
                    }
                );
            }
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}


/* =================================
   DATABASE HELPERS
================================= */

function addMaterialToDatabase(material) {

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(
            STORE_NAME,
            'readwrite'
        );

        const store =
            transaction.objectStore(STORE_NAME);

        const request =
            store.add(material);

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}


function getAllMaterials() {

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(
            STORE_NAME,
            'readonly'
        );

        const store =
            transaction.objectStore(STORE_NAME);

        const request =
            store.getAll();

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}


function deleteMaterialFromDatabase(materialId) {

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(
            STORE_NAME,
            'readwrite'
        );

        const store =
            transaction.objectStore(STORE_NAME);

        const request =
            store.delete(materialId);

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}


/* =================================
   ADMIN CHECK
================================= */

function isCurrentUserAdmin() {

    console.log('ADMIN CHECK:', {
        ADMIN_EMAIL: typeof ADMIN_EMAIL !== 'undefined'
            ? ADMIN_EMAIL
            : 'НЕ ОПРЕДЕЛЁН',

        authExists: typeof auth !== 'undefined',

        currentUser: typeof auth !== 'undefined' && auth.currentUser
            ? auth.currentUser.email
            : 'НЕТ ПОЛЬЗОВАТЕЛЯ'
    });

    return (
        typeof ADMIN_EMAIL !== 'undefined' &&
        ADMIN_EMAIL !== 'ВСТАВЬТЕ_ВАШ_EMAIL_СЮДА' &&
        typeof auth !== 'undefined' &&
        auth.currentUser &&
        (auth.currentUser.email || '').toLowerCase() ===
            ADMIN_EMAIL.toLowerCase()
    );
}


/* =================================
   MODAL
================================= */

const modal =
    document.getElementById('materialModal');

const addMaterialBtn =
    document.getElementById('addMaterialBtn');

const closeMaterialModal =
    document.getElementById('closeMaterialModal');

const cancelMaterialBtn =
    document.getElementById('cancelMaterialBtn');


function openMaterialModal() {

    if (!modal) return;

    modal.classList.remove('hidden');

    document.body.style.overflow = 'hidden';

    const titleInput =
        document.getElementById('materialTitle');

    if (titleInput) {

        setTimeout(() => {
            titleInput.focus();
        }, 100);
    }
}


function closeMaterialModalWindow() {

    if (!modal) return;

    modal.classList.add('hidden');

    document.body.style.overflow = '';

    const form =
        document.getElementById('materialForm');

    if (form) {
        form.reset();
    }
}


if (addMaterialBtn) {

    addMaterialBtn.addEventListener(
        'click',
        openMaterialModal
    );
}


if (closeMaterialModal) {

    closeMaterialModal.addEventListener(
        'click',
        closeMaterialModalWindow
    );
}


if (cancelMaterialBtn) {

    cancelMaterialBtn.addEventListener(
        'click',
        closeMaterialModalWindow
    );
}


/* =================================
   CLOSE MODAL
================================= */

if (modal) {

    modal.addEventListener(
        'click',
        (event) => {

            if (event.target === modal) {
                closeMaterialModalWindow();
            }

        }
    );
}


document.addEventListener(
    'keydown',
    (event) => {

        if (event.key === 'Escape') {

            if (
                modal &&
                !modal.classList.contains('hidden')
            ) {
                closeMaterialModalWindow();
            }
        }
    }
);


/* =================================
   FORM
================================= */

const materialForm =
    document.getElementById('materialForm');


if (materialForm) {

    materialForm.addEventListener(
        'submit',
        async (event) => {

            event.preventDefault();

            const title =
                document
                    .getElementById('materialTitle')
                    .value
                    .trim();

            const type =
                document
                    .getElementById('materialType')
                    .value;

            const level =
                document
                    .getElementById('materialLevel')
                    .value;

            const subject =
                document
                    .getElementById('materialSubject')
                    .value
                    .trim();

            const description =
                document
                    .getElementById('materialDescription')
                    .value
                    .trim();

            const fileInput =
                document.getElementById('materialFile');

            const file =
                fileInput.files[0];


            /* VALIDATION */

            if (!title) {

                alert(
                    'Введите название материала.'
                );

                return;
            }


            if (!type) {

                alert(
                    'Выберите тип материала.'
                );

                return;
            }


            if (!file) {

                alert(
                    'Выберите файл материала.'
                );

                return;
            }


            /* MATERIAL */

            const material = {

                id: crypto.randomUUID(),

                title,

                type,

                level,

                subject,

                description,

                fileName: file.name,

                fileType: file.type,

                fileSize: file.size,

                file
            };


            try {

                await addMaterialToDatabase(
                    material
                );

                closeMaterialModalWindow();

                await renderMaterials();

            } catch (error) {

                console.error(
                    'Ошибка сохранения материала:',
                    error
                );

                alert(
                    'Не удалось сохранить материал.'
                );
            }
        }
    );
}


/* =================================
   SEARCH
================================= */

const searchInput =
    document.getElementById('materialsSearch');


if (searchInput) {

    searchInput.addEventListener(
        'input',
        () => {

            currentSearch =
                searchInput.value
                    .trim()
                    .toLowerCase();

            renderMaterials();
        }
    );
}


/* =================================
   CATEGORIES
================================= */

const categoryButtons =
    document.querySelectorAll(
        '.category-button'
    );


categoryButtons.forEach((button) => {

    button.addEventListener(
        'click',
        () => {

            categoryButtons.forEach(
                (item) => {
                    item.classList.remove(
                        'active'
                    );
                }
            );

            button.classList.add('active');

            currentCategory =
                button.dataset.category;

            renderMaterials();
        }
    );

});


/* =================================
   FORMAT FILE SIZE
================================= */

function formatFileSize(bytes) {

    if (!bytes) {
        return '0 Б';
    }

    const units = [
        'Б',
        'КБ',
        'МБ',
        'ГБ'
    ];

    let size = bytes;
    let unitIndex = 0;

    while (
        size >= 1024 &&
        unitIndex < units.length - 1
    ) {

        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(
        size >= 10 || unitIndex === 0
            ? 0
            : 1
    )} ${units[unitIndex]}`;
}


/* =================================
   RUSSIAN COUNT
================================= */

function formatMaterialCount(count) {

    if (count === 1) {
        return '1 материал';
    }

    if (
        count >= 2 &&
        count <= 4
    ) {
        return `${count} материала`;
    }

    return `${count} материалов`;
}


/* =================================
   CREATE CARD
================================= */

function createMaterialCard(material) {

    const card =
        document.createElement('article');

    card.className =
        'material-card';


    /* TYPE */

    const type =
        document.createElement('div');

    type.className =
        'material-card-type';

    type.textContent =
        material.type;


    /* TITLE */

    const title =
        document.createElement('h2');

    title.textContent =
        material.title;


    /* DESCRIPTION */

    const description =
        document.createElement('p');

    description.textContent =
        material.description ||
        'Описание отсутствует.';


    /* META */

    const meta =
        document.createElement('p');

    meta.style.marginTop = '12px';
    meta.style.fontSize = '12px';
    meta.style.color = 'var(--ink-dim)';

    const metaParts = [];

    if (material.subject) {
        metaParts.push(material.subject);
    }

    if (material.level) {
        metaParts.push(material.level);
    }

    if (material.fileName) {

        metaParts.push(
            `${material.fileName} · ${formatFileSize(material.fileSize)}`
        );
    }

    meta.textContent =
        metaParts.join(' · ');


    /* BUTTONS */

    const buttonsWrap =
        document.createElement('div');

    buttonsWrap.style.display = 'flex';
    buttonsWrap.style.gap = '8px';
    buttonsWrap.style.marginTop = 'auto';


    /* OPEN BUTTON */

    const openButton =
        document.createElement('button');

    openButton.className =
        'material-card-button';

    openButton.type =
        'button';

    openButton.textContent =
        'Открыть';


    openButton.addEventListener(
        'click',
        () => {

            if (!material.file) {

                alert(
                    'Файл этого материала недоступен.'
                );

                return;
            }

            const url =
                URL.createObjectURL(
                    material.file
                );

            const link =
                document.createElement('a');

            link.href = url;

            link.target = '_blank';

            link.rel = 'noopener';

            link.click();

            setTimeout(() => {

                URL.revokeObjectURL(url);

            }, 1000);
        }
    );


    /* ADMIN DELETE BUTTON */

    if (isCurrentUserAdmin()) {

        const deleteButton =
            document.createElement('button');

        deleteButton.type =
            'button';

        deleteButton.textContent =
            'Удалить';

        deleteButton.style.flex =
            '0 0 auto';

        deleteButton.style.padding =
            '10px 14px';

        deleteButton.style.border =
            '1px solid var(--red)';

        deleteButton.style.borderRadius =
            'var(--radius)';

        deleteButton.style.background =
            'transparent';

        deleteButton.style.color =
            'var(--red)';

        deleteButton.style.cursor =
            'pointer';

        deleteButton.style.fontFamily =
            'var(--sans)';

        deleteButton.style.fontSize =
            '13px';

        deleteButton.style.fontWeight =
            '600';


        deleteButton.addEventListener(
            'click',
            async () => {

                await deleteMaterial(
                    material.id
                );
            }
        );


        buttonsWrap.appendChild(
            deleteButton
        );
    }


    /* APPEND */

    buttonsWrap.appendChild(
        openButton
    );

    card.appendChild(type);

    card.appendChild(title);

    card.appendChild(description);

    card.appendChild(meta);

    card.appendChild(buttonsWrap);


    return card;
}


/* =================================
   DELETE MATERIAL
================================= */

async function deleteMaterial(materialId) {

    if (!isCurrentUserAdmin()) {

        alert(
            'Удалять материалы может только администратор.'
        );

        return;
    }


    const confirmed =
        confirm(
            'Удалить этот материал?'
        );


    if (!confirmed) {
        return;
    }


    try {

        await deleteMaterialFromDatabase(
            materialId
        );

        await renderMaterials();

    } catch (error) {

        console.error(
            'Ошибка удаления материала:',
            error
        );

        alert(
            'Не удалось удалить материал.'
        );
    }
}


/* =================================
   FILTER
================================= */

function filterMaterials(materials) {

    return materials.filter(
        (material) => {

            const matchesCategory =
                currentCategory === 'all' ||
                material.type === currentCategory;


            const searchText = [

                material.title,

                material.description,

                material.subject,

                material.level,

                material.type,

                material.fileName

            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();


            const matchesSearch =
                !currentSearch ||
                searchText.includes(
                    currentSearch
                );


            return (
                matchesCategory &&
                matchesSearch
            );
        }
    );
}


/* =================================
   RENDER
================================= */

async function renderMaterials() {

    const grid =
        document.getElementById(
            'materialsGrid'
        );

    const empty =
        document.getElementById(
            'materialsEmpty'
        );

    const count =
        document.getElementById(
            'materialsCount'
        );


    if (!grid || !empty || !count) {
        return;
    }


    try {

        const materials =
            await getAllMaterials();

        const filteredMaterials =
            filterMaterials(materials);


        /* CLEAR */

        grid.innerHTML = '';


        /* COUNT */

        count.textContent =
            formatMaterialCount(
                filteredMaterials.length
            );


        /* EMPTY */

        if (
            filteredMaterials.length === 0
        ) {

            empty.classList.remove(
                'hidden'
            );

            return;
        }


        empty.classList.add(
            'hidden'
        );


        /* CARDS */

        filteredMaterials.forEach(
            (material) => {

                const card =
                    createMaterialCard(
                        material
                    );

                grid.appendChild(card);
            }
        );

    } catch (error) {

        console.error(
            'Ошибка загрузки материалов:',
            error
        );

        count.textContent =
            'Ошибка загрузки';
    }
}


/* =================================
   INITIALIZATION
================================= */

async function initMaterials() {

    try {

        db =
            await openDatabase();

        await renderMaterials();

    } catch (error) {

        console.error(
            'Не удалось запустить библиотеку:',
            error
        );

        alert(
            'Не удалось запустить библиотеку материалов.'
        );
    }
}

if (typeof auth !== 'undefined') {
    auth.onAuthStateChanged(() => {
        renderMaterials();
    });
}

initMaterials();