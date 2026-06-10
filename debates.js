const INITIAL_ITEMS = 5;
const ITEMS_PER_LOAD = 5;
const isDE = (window.LANG === 'de');

const THEMATIC_CATEGORIES = [
    {
        id: 'asyl',
        label_fr: 'Asile & procédures',
        label_de: 'Asylwesen & Verfahren',
        keywords: ['asyl', 'asile', 'asylwesen', 'asylverfahren', 'asylpolitik', 'asylgesetz', 'asylg', 'dublin', 'härtefallregelung', 'cas de rigueur', 'procédure d\'asile', 'loi sur l\'asile', 'lasi']
    },
    {
        id: 'fluechtlinge',
        label_fr: 'Réfugiés & statut de protection',
        label_de: 'Flüchtlinge & Schutzstatus',
        keywords: ['flüchtling', 'réfugié', 'schutzstatus', 'statut de protection', 'ukraine', 'vorläufige aufnahme', 'admission provisoire', 'n-ausweis', 'f-ausweis', 'permis n', 'permis f', 'livret n', 'livret f']
    },
    {
        id: 'aufenthalt',
        label_fr: 'Séjour & marché du travail',
        label_de: 'Aufenthalt & Arbeitsmarkt',
        keywords: ['ausländerrecht', 'droit des étrangers', 'ausländer- und integrationsgesetz', 'aig', 'letr', 'loi sur les étrangers', 'b-ausweis', 'c-ausweis', 'permis b', 'permis c', 'livret b', 'livret c', 'aufenthaltsbewilligung', 'autorisation de séjour', 'niederlassungsbewilligung', 'autorisation d\'établissement', 'arbeitsbewilligung', 'autorisation de travail', 'familiennachzug', 'regroupement familial']
    },
    {
        id: 'integration',
        label_fr: 'Intégration & naturalisation',
        label_de: 'Integration & Einbürgerung',
        keywords: ['integration', 'intégration', 'einbürgerung', 'naturalisation', 'schweizer bürgerrecht', 'droit de cité', 'bürgerrechtsgesetz', 'loi sur la nationalité']
    },
    {
        id: 'wegweisung',
        label_fr: 'Renvoi & sans-papiers',
        label_de: 'Wegweisung & Sans-Papiers',
        keywords: ['rückkehrhilfe', 'aide au retour', 'rückführung', 'rapatriement', 'wegweisung', 'renvoi', 'ausschaffung', 'expulsion', 'sans-papiers']
    },
    {
        id: 'grenze',
        label_fr: 'Gestion des frontières & autorités',
        label_de: 'Grenzmanagement & Behörden',
        keywords: ['migration', 'migrationspolitik', 'politique migratoire', 'schengen', 'visum', 'visa', 'grenze', 'frontière', 'sem ']
    }
];

function getDebateCategories(item) {
    const searchText = [
        item.business_title_fr, item.business_title_de, item.text
    ].filter(Boolean).join(' ').toLowerCase();
    
    const categories = [];
    for (const cat of THEMATIC_CATEGORIES) {
        if (cat.keywords.some(kw => searchText.includes(kw.toLowerCase()))) {
            categories.push(cat.id);
        }
    }
    return categories;
}

let allData = [];
let filteredData = [];
let displayedCount = 0;
let newIds = [];
let objectsData = {};
let sortDescending = true;

const searchInput = document.getElementById('searchInput');
const clearSearch = document.getElementById('clearSearch');
const resultsContainer = document.getElementById('results');
const resultsCount = document.getElementById('resultsCount');
const lastUpdate = document.getElementById('lastUpdate');
const resetFilters = document.getElementById('resetFilters');
const showNewUpdatesBtn = document.getElementById('showNewUpdates');

const councilLabels = isDE ? {
    'N': 'Nationalrat',
    'S': 'Ständerat',
    'V': 'Vereinigte Bundesversammlung'
} : {
    'N': 'Conseil national',
    'S': 'Conseil des États',
    'V': 'Assemblée fédérale'
};

const partyLabels = isDE ? {
    'V': 'SVP',
    'S': 'SP',
    'RL': 'FDP',
    'M-E': 'Die Mitte',
    'CE': 'Die Mitte',
    'C': 'Die Mitte',
    'BD': 'Die Mitte',
    'G': 'GRÜNE',
    'GL': 'GLP'
} : {
    'V': 'UDC',
    'S': 'PS',
    'RL': 'PLR',
    'M-E': 'Le Centre',
    'CE': 'Le Centre',
    'C': 'Le Centre',
    'BD': 'Le Centre',
    'G': 'VERT-E-S',
    'GL': 'Vert\'libéraux'
};

// Synonymes bilingues pour recherche étendue
const searchSynonyms = {
    // Partis politiques
    'plr': ['fdp', 'plr'],
    'fdp': ['plr', 'fdp'],
    'ps': ['sp', 'ps'],
    'sp': ['ps', 'sp'],
    'udc': ['svp', 'udc'],
    'svp': ['udc', 'svp'],
    'le centre': ['die mitte', 'le centre', 'mitte'],
    'die mitte': ['le centre', 'die mitte', 'mitte'],
    'mitte': ['le centre', 'die mitte', 'mitte'],
    'les verts': ['grüne', 'verts', 'vert-e-s'],
    'verts': ['grüne', 'les verts', 'vert-e-s'],
    'vert-e-s': ['grüne', 'les verts', 'verts'],
    'grüne': ['les verts', 'verts', 'vert-e-s'],
    'vert\'libéraux': ['grünliberale', 'pvl', 'glp'],
    'pvl': ['glp', 'vert\'libéraux', 'grünliberale'],
    'glp': ['pvl', 'vert\'libéraux', 'grünliberale'],
    'grünliberale': ['pvl', 'vert\'libéraux', 'glp'],
    // Départements fédéraux
    'ddps': ['vbs', 'ddps'],
    'vbs': ['ddps', 'vbs'],
    'dfae': ['eda', 'dfae'],
    'eda': ['dfae', 'eda'],
    'dfi': ['edi', 'dfi'],
    'edi': ['dfi', 'edi'],
    'dfjp': ['ejpd', 'dfjp'],
    'ejpd': ['dfjp', 'ejpd'],
    'dff': ['efd', 'dff'],
    'efd': ['dff', 'efd'],
    'defr': ['wbf', 'defr'],
    'wbf': ['defr', 'wbf'],
    'detec': ['uvek', 'detec'],
    'uvek': ['detec', 'uvek'],
    // Migration/Asile
    'sem': ['sem', 'sbm'],
    'migration': ['migration', 'zuwanderung'],
    'asile': ['asyl', 'asile'],
    'réfugiés': ['flüchtlinge', 'réfugiés']
};

function getSearchTerms(term) {
    const lowerTerm = term.toLowerCase();
    const synonyms = searchSynonyms[lowerTerm];
    return synonyms ? synonyms : [lowerTerm];
}

function searchWholeWord(text, term) {
    if (!text || !term) return false;
    const lowerText = text.toLowerCase();
    const lowerTerm = term.toLowerCase();
    if (/^\d+\.\d+$/.test(term)) {
        return lowerText.includes(lowerTerm);
    }
    if (term.includes(' ') || /[àâäéèêëïîôùûüç]/i.test(term)) {
        return lowerText.includes(lowerTerm);
    }
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedTerm}\\b`, 'i');
    return regex.test(text);
}

function getPartyDisplay(item) {
    if (!item.party || item.party === 'undefined' || item.party === '') {
        return isDE ? 'Bundesrat' : 'Conseil fédéral';
    }
    return partyLabels[item.party] || item.party;
}

async function init() {
    try {
        const [debatesResponse, objectsResponse] = await Promise.all([
            fetch('debates_data.json'),
            fetch('sem_migration_data.json')
        ]);
        
        const data = await debatesResponse.json();
        const objectsJson = await objectsResponse.json();
        
        allData = data.items || [];
        newIds = data.new_ids || [];
        
        // Créer le mapping business_number -> tags
        if (objectsJson.items) {
            objectsJson.items.forEach(item => {
                if (item.shortId && item.tags) {
                    objectsData[item.shortId] = item.tags;
                }
            });
        }
        
        // Trier du plus récent au plus vieux
        allData.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        
        if (data.meta) {
            const updated = new Date(data.meta.updated);
            lastUpdate.textContent = isDE ? `Aktualisierung: ${updated.toLocaleDateString('de-CH')}` : `Mise à jour: ${updated.toLocaleDateString('fr-CH')}`;
        }
        
        populateYearFilter();
        populateSessionFilter();
        populateCouncilFilter();
        populatePartyFilter();
        populateDepartmentFilter();
        populateTagsFilter();
        initDropdownFilters();
        
        // Gérer les paramètres URL
        const urlParams = new URLSearchParams(window.location.search);
        const filterParty = urlParams.get('filter_party');
        const filterCouncil = urlParams.get('filter_council');
        const filterYear = urlParams.get('filter_year');
        const filterSession = urlParams.get('filter_session');
        const filterDept = urlParams.get('filter_dept');
        const filterTags = urlParams.get('filter_tags');
        const filterLegislature = urlParams.get('filter_legislature');
        const searchParam = urlParams.get('search');
        
        if (filterParty) applyUrlFilter('partyMenu', filterParty);
        if (filterCouncil) applyUrlFilter('councilMenu', filterCouncil);
        if (filterYear) applyUrlFilter('yearMenu', filterYear);
        if (filterSession) applyUrlFilter('sessionMenu', filterSession);
        if (filterDept) applyUrlFilter('departmentMenu', filterDept);
        if (filterTags) applyUrlFilter('tagsMenu', filterTags);
        if (filterLegislature) applyUrlFilter('legislatureMenu', filterLegislature);
        if (searchParam) searchInput.value = searchParam;
        
        filteredData = [...allData];
        applyFilters();
        
        setupEventListeners();
    } catch (error) {
        console.error('Error loading data:', error);
        resultsContainer.innerHTML = `<p class="error">${isDE ? 'Fehler beim Laden der Daten' : 'Erreur de chargement des données'}</p>`;
    }
}

function applyUrlFilter(menuId, filterValue) {
    const menu = document.getElementById(menuId);
    if (!menu) return;
    
    const filterValues = filterValue.split(',').map(v => v.trim());
    const selectAll = menu.querySelector('[data-select-all]');
    if (selectAll) selectAll.checked = false;
    
    const checkboxes = menu.querySelectorAll('input[type="checkbox"]:not([data-select-all])');
    checkboxes.forEach(cb => {
        const label = cb.parentElement.textContent.trim();
        cb.checked = filterValues.some(v => label.includes(v) || cb.value === v);
    });
    
    const dropdown = menu.closest('.filter-dropdown');
    if (dropdown) {
        updateFilterCount(dropdown.id);
    }
}

// Mapping des types de sessions
const _winter = isDE ? 'Winter' : 'Hiver';
const _spring = isDE ? 'Frühling' : 'Printemps';
const _special = isDE ? 'Sondersession' : 'Spéciale';
const _summer = isDE ? 'Sommer' : 'Été';
const _autumn = isDE ? 'Herbst' : 'Automne';

const sessionTypes = {
    '5001': _winter, '5002': _spring, '5003': _special, '5004': _summer, '5005': _autumn,
    '5006': _winter, '5007': _spring, '5008': _special, '5009': _summer, '5010': _autumn,
    '5011': _winter, '5012': _spring, '5013': _summer, '5014': _autumn,
    '5015': _winter, '5016': _spring, '5017': _special, '5018': _summer, '5019': _autumn,
    '5101': _winter, '5102': _spring, '5103': _special, '5104': _summer, '5105': _autumn,
    '5106': _special, '5107': _winter, '5108': _spring, '5109': _special, '5110': _summer,
    '5111': _autumn, '5112': _winter, '5113': _spring, '5114': _special, '5115': _summer,
    '5116': _autumn, '5117': _winter, '5118': _spring, '5119': _special, '5120': _special,
    '5121': _summer, '5122': _autumn,
    '5201': _winter, '5202': _spring, '5203': _special, '5204': _summer, '5205': _autumn,
    '5206': _winter, '5207': _spring, '5208': _special, '5209': _summer, '5210': _autumn,
    '5211': _winter, '5212': _spring, '5213': _special, '5214': _summer, '5215': _autumn,
    '5216': _winter, '5217': _spring, '5218': _special
};

function populateYearFilter() {
    const yearMenu = document.getElementById('yearMenu');
    const years = [...new Set(allData.map(item => item.date ? item.date.substring(0, 4) : null).filter(Boolean))];
    years.sort().reverse();
    
    const allLabel = document.createElement('label');
    allLabel.className = 'select-all';
    allLabel.innerHTML = `<input type="checkbox" data-select-all checked> ${isDE ? 'Alle' : 'Toutes'}`;
    yearMenu.appendChild(allLabel);
    
    years.forEach(year => {
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" value="${year}"> ${year}`;
        yearMenu.appendChild(label);
    });
}

function populateSessionFilter() {
    const sessionMenu = document.getElementById('sessionMenu');
    const sessionTypesList = isDE
        ? ['Winter', 'Frühling', 'Sommer', 'Herbst', 'Sondersession']
        : ['Hiver', 'Printemps', 'Été', 'Automne', 'Spéciale'];
    
    const allLabel = document.createElement('label');
    allLabel.className = 'select-all';
    allLabel.innerHTML = `<input type="checkbox" data-select-all checked> ${isDE ? 'Alle' : 'Toutes'}`;
    sessionMenu.appendChild(allLabel);
    
    sessionTypesList.forEach(sessionType => {
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" value="${sessionType}"> ${sessionType}`;
        sessionMenu.appendChild(label);
    });
}

function populateCouncilFilter() {
    const councilMenu = document.getElementById('councilMenu');
    
    const councilOptions = isDE ? [
        { value: 'N', label: 'Nationalrat' },
        { value: 'S', label: 'Ständerat' },
        { value: 'V', label: 'Vereinigte Bundesversammlung' }
    ] : [
        { value: 'N', label: 'Conseil national' },
        { value: 'S', label: 'Conseil des États' },
        { value: 'V', label: 'Assemblée fédérale' }
    ];
    
    const allLabel = document.createElement('label');
    allLabel.className = 'select-all';
    allLabel.innerHTML = `<input type="checkbox" data-select-all checked> ${isDE ? 'Alle' : 'Tous'}`;
    councilMenu.appendChild(allLabel);
    
    councilOptions.forEach(option => {
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" value="${option.value}"> ${option.label}`;
        councilMenu.appendChild(label);
    });
}

function populatePartyFilter() {
    const partyMenu = document.getElementById('partyMenu');
    const partyGroups = {};
    let hasFederalCouncil = false;
    
    allData.forEach(item => {
        if (!item.party) {
            hasFederalCouncil = true;
            return;
        }
        const displayName = partyLabels[item.party] || item.party;
        if (!partyGroups[displayName]) {
            partyGroups[displayName] = [];
        }
        if (!partyGroups[displayName].includes(item.party)) {
            partyGroups[displayName].push(item.party);
        }
    });
    
    const displayNames = Object.keys(partyGroups).sort((a, b) => a.localeCompare(b, 'fr'));
    
    const allLabel = document.createElement('label');
    allLabel.className = 'select-all';
    allLabel.innerHTML = `<input type="checkbox" data-select-all checked> ${isDE ? 'Alle' : 'Tous'}`;
    partyMenu.appendChild(allLabel);
    
    if (hasFederalCouncil) {
        const cfLabelText = isDE ? 'Bundesrat' : 'Conseil fédéral';
        const cfLabel = document.createElement('label');
        cfLabel.innerHTML = `<input type="checkbox" value="${cfLabelText}"> ${cfLabelText}`;
        partyMenu.appendChild(cfLabel);
    }
    
    displayNames.forEach(displayName => {
        const label = document.createElement('label');
        const values = partyGroups[displayName].join(',');
        label.innerHTML = `<input type="checkbox" value="${values}"> ${displayName}`;
        partyMenu.appendChild(label);
    });
}

function translateDepartment(deptDE) {
    if (isDE) return deptDE;
    const translations = {
        'EFD': 'DFF',
        'EDI': 'DFI',
        'UVEK': 'DETEC',
        'VBS': 'DDPS',
        'EJPD': 'DFJP',
        'EDA': 'DFAE',
        'WBF': 'DEFR',
        'BK': 'ChF',
        'BGer': 'TF',
        'Parl': 'Parl',
        'VBV': 'AF'
    };
    return translations[deptDE] || deptDE;
}

function populateDepartmentFilter() {
    const deptMenu = document.getElementById('departmentMenu');
    if (!deptMenu) return;
    
    const departments = [...new Set(allData.map(item => item.department).filter(Boolean))];
    departments.sort((a, b) => translateDepartment(a).localeCompare(translateDepartment(b), 'fr'));
    
    const allLabel = document.createElement('label');
    allLabel.className = 'select-all';
    allLabel.innerHTML = `<input type="checkbox" data-select-all checked> ${isDE ? 'Alle' : 'Tous'}`;
    deptMenu.appendChild(allLabel);
    
    departments.forEach(dept => {
        const label = document.createElement('label');
        const deptFR = translateDepartment(dept);
        label.innerHTML = `<input type="checkbox" value="${dept}"> ${deptFR}`;
        deptMenu.appendChild(label);
    });
}

function populateTagsFilter() {
    const tagsMenu = document.getElementById('tagsMenu');
    if (!tagsMenu) return;
    
    const allLabel = document.createElement('label');
    allLabel.className = 'select-all';
    allLabel.innerHTML = `<input type="checkbox" data-select-all checked> ${isDE ? 'Alle' : 'Toutes'}`;
    tagsMenu.appendChild(allLabel);
    
    THEMATIC_CATEGORIES.forEach(cat => {
        const label = document.createElement('label');
        const displayLabel = isDE ? cat.label_de : cat.label_fr;
        label.innerHTML = `<input type="checkbox" value="${cat.id}"> ${displayLabel}`;
        tagsMenu.appendChild(label);
    });
}

function initDropdownFilters() {
    document.querySelectorAll('.filter-dropdown').forEach(dropdown => {
        const btn = dropdown.querySelector('.filter-btn');
        const menu = dropdown.querySelector('.filter-menu');
        
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.filter-dropdown').forEach(d => {
                if (d !== dropdown) d.classList.remove('open');
            });
            dropdown.classList.toggle('open');
        });
        
        menu.addEventListener('click', (e) => e.stopPropagation());
        
        const selectAll = menu.querySelector('[data-select-all]');
        const checkboxes = menu.querySelectorAll('input[type="checkbox"]:not([data-select-all])');
        
        if (selectAll) {
            selectAll.addEventListener('change', () => {
                checkboxes.forEach(cb => cb.checked = false);
                selectAll.checked = true;
                updateFilterCount(dropdown.id);
                applyFilters();
            });
        }
        
        checkboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                if (cb.checked && selectAll) selectAll.checked = false;
                const anyChecked = Array.from(checkboxes).some(c => c.checked);
                if (!anyChecked && selectAll) selectAll.checked = true;
                updateFilterCount(dropdown.id);
                applyFilters();
            });
        });
    });
    
    document.addEventListener('click', () => {
        document.querySelectorAll('.filter-dropdown').forEach(d => d.classList.remove('open'));
    });
}

function updateFilterCount(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    const countSpan = dropdown.querySelector('.filter-count');
    const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]:not([data-select-all]):checked');
    
    if (checkboxes.length > 0) {
        const selectedLabels = Array.from(checkboxes).map(cb => cb.parentElement.textContent.trim());
        if (selectedLabels.length === 1) {
            countSpan.textContent = `: ${selectedLabels[0]}`;
        } else if (selectedLabels.length <= 2) {
            countSpan.textContent = `: ${selectedLabels.join(', ')}`;
        } else {
            countSpan.textContent = `: ${selectedLabels[0]} +${selectedLabels.length - 1}`;
        }
    } else {
        countSpan.textContent = '';
    }
}

function getCheckedValues(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return null;
    const selectAll = dropdown.querySelector('[data-select-all]');
    if (selectAll && selectAll.checked) return null;
    const checked = dropdown.querySelectorAll('input[type="checkbox"]:not([data-select-all]):checked');
    return Array.from(checked).map(cb => cb.value);
}

function setupEventListeners() {
    searchInput.addEventListener('input', applyFilters);
    
    clearSearch.addEventListener('click', () => {
        searchInput.value = '';
        applyFilters();
    });
    
    resetFilters.addEventListener('click', () => {
        searchInput.value = '';
        document.querySelectorAll('.filter-dropdown').forEach(dropdown => {
            const selectAll = dropdown.querySelector('[data-select-all]');
            const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]:not([data-select-all])');
            if (selectAll) selectAll.checked = true;
            checkboxes.forEach(cb => cb.checked = false);
            updateFilterCount(dropdown.id);
        });
        window.newUpdatesFilter = false;
        if (showNewUpdatesBtn) showNewUpdatesBtn.classList.remove('active');
        applyFilters();
    });
    
    if (showNewUpdatesBtn) {
        showNewUpdatesBtn.addEventListener('click', toggleNewUpdatesFilter);
    }
    
    const sortOrderBtn = document.getElementById('sortOrderBtn');
    if (sortOrderBtn) {
        sortOrderBtn.addEventListener('click', toggleSortOrder);
    }
}

function toggleSortOrder() {
    sortDescending = !sortDescending;
    const btn = document.getElementById('sortOrderBtn');
    if (btn) {
        btn.textContent = sortDescending ? (isDE ? '↓ Neuste' : '↓ Récent') : (isDE ? '↑ Älteste' : '↑ Ancien');
    }
    applyFilters();
}

function toggleNewUpdatesFilter() {
    window.newUpdatesFilter = !window.newUpdatesFilter;
    if (window.newUpdatesFilter) {
        showNewUpdatesBtn.classList.add('active');
    } else {
        showNewUpdatesBtn.classList.remove('active');
    }
    applyFilters();
}

function getLegislatureFromSession(sessionId) {
    if (!sessionId) return null;
    const sessionStr = String(sessionId);
    if (sessionStr.startsWith('52')) return '52';
    if (sessionStr.startsWith('51')) return '51';
    if (sessionStr.startsWith('50')) return '50';
    return null;
}

function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const yearValues = getCheckedValues('yearDropdown');
    const sessionValues = getCheckedValues('sessionDropdown');
    const councilValues = getCheckedValues('councilDropdown');
    const partyValues = getCheckedValues('partyDropdown');
    const departmentValues = getCheckedValues('departmentDropdown');
    const legislatureValues = getCheckedValues('legislatureDropdown');
    const tagsValues = getCheckedValues('tagsDropdown');
    
    filteredData = allData.filter(item => {
        // New updates filter
        if (window.newUpdatesFilter) {
            const now = new Date();
            const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
            const dateStr = String(item.date);
            const year = dateStr.substring(0, 4);
            const month = dateStr.substring(4, 6);
            const day = dateStr.substring(6, 8);
            const itemDate = new Date(`${year}-${month}-${day}T12:00:00`);
            if (itemDate < fourDaysAgo) return false;
        }
        
        if (searchTerm) {
            const searchFields = [
                item.speaker,
                item.text,
                item.party,
                item.canton,
                item.business_number,
                item.business_title_fr,
                item.business_title_de
            ].filter(Boolean).join(' ');
            
            const searchTerms = getSearchTerms(searchTerm);
            const found = searchTerms.some(term => searchWholeWord(searchFields, term));
            if (!found) return false;
        }
        
        if (yearValues && item.date) {
            const itemYear = item.date.substring(0, 4);
            if (!yearValues.includes(itemYear)) return false;
        }
        
        if (sessionValues) {
            const itemSessionType = sessionTypes[item.id_session];
            if (!sessionValues.includes(itemSessionType)) return false;
        }
        
        if (councilValues && !councilValues.includes(item.council)) return false;
        
        if (partyValues) {
            const allPartyValues = partyValues.flatMap(v => v.split(','));
            const isFederalCouncil = !item.party;
            const matchesFederalCouncil = allPartyValues.includes(isDE ? 'Bundesrat' : 'Conseil fédéral') && isFederalCouncil;
            const matchesParty = item.party && allPartyValues.includes(item.party);
            if (!matchesFederalCouncil && !matchesParty) return false;
        }
        
        if (departmentValues) {
            const itemDept = item.department || 'none';
            if (!departmentValues.includes(itemDept)) return false;
        }
        
        if (legislatureValues) {
            const itemLegislature = getLegislatureFromSession(item.id_session);
            if (!legislatureValues.includes(itemLegislature)) return false;
        }
        
        if (tagsValues.length > 0) {
            const itemCategories = getDebateCategories(item);
            const hasMatchingCategory = itemCategories.some(cat => tagsValues.includes(cat));
            if (!hasMatchingCategory) return false;
        }
        
        return true;
    });
    
    filteredData.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        return sortDescending ? dateB.localeCompare(dateA) : dateA.localeCompare(dateB);
    });
    
    renderResults();
    updateURL();
}

function updateURL() {
    const params = new URLSearchParams();
    const searchTerm = searchInput.value.trim();
    if (searchTerm) params.set('search', searchTerm);
    
    const yearValues = getCheckedValues('yearDropdown');
    if (yearValues && yearValues.length > 0) params.set('filter_year', yearValues.join(','));
    
    const sessionValues = getCheckedValues('sessionDropdown');
    if (sessionValues && sessionValues.length > 0) params.set('filter_session', sessionValues.join(','));
    
    const councilValues = getCheckedValues('councilDropdown');
    if (councilValues && councilValues.length > 0) params.set('filter_council', councilValues.join(','));
    
    const partyValues = getCheckedValues('partyDropdown');
    if (partyValues && partyValues.length > 0) params.set('filter_party', partyValues.join(','));
    
    const departmentValues = getCheckedValues('departmentDropdown');
    if (departmentValues && departmentValues.length > 0) params.set('filter_department', departmentValues.join(','));
    
    const legislatureValues = getCheckedValues('legislatureDropdown');
    if (legislatureValues && legislatureValues.length > 0) params.set('filter_legislature', legislatureValues.join(','));
    
    const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, document.title, newUrl);
}

function formatDate(dateStr) {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${day}.${month}.${year}`;
}

function highlightKeywords(text, searchTerm = '') {
    // Nettoyer les bugs de mise en forme
    let result = text
        .replace(/\[[^\]]*\]/g, ' ')
        .replace(/\(NB\)/gi, ' ')
        .replace(/\(AB\)/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    
    // Créer des paragraphes
    result = result.replace(/\. ([A-Z])/g, '.</p><p>$1');
    result = '<p>' + result + '</p>';
    
    // Surligner les termes liés à la migration/asile
    const migrationTerms = [
        'SEM', 'Migration', 'Asyl', 'Asile', 'Flüchtling', 'réfugié',
        'Zuwanderung', 'immigration', 'Staatssekretariat für Migration',
        'Secrétariat d\'État aux migrations', 'Segreteria di Stato della migrazione'
    ];
    
    migrationTerms.forEach(term => {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Utiliser \b pour les termes courts afin d'éviter les faux positifs (ex: SEM dans enSEMble)
        const regex = term.length <= 4
            ? new RegExp(`\\b(${escaped})\\b`, 'g')
            : new RegExp(`(${escaped})`, 'gi');
        result = result.replace(regex, '<mark class="highlight">$1</mark>');
    });
    
    // Surligner le terme de recherche et ses synonymes
    if (searchTerm && searchTerm.length >= 2) {
        const searchTerms = getSearchTerms(searchTerm);
        searchTerms.forEach(term => {
            const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const searchRegex = new RegExp(`(${escapedTerm})`, 'gi');
            result = result.replace(searchRegex, '<mark class="highlight-search">$1</mark>');
        });
    }
    
    return result;
}

function createCard(item, searchTerm = '') {
    const card = document.createElement('div');
    // Bande verte si date < 4 jours
    const now = new Date();
    const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
    const dateStr = String(item.date);
    const debateDate = new Date(`${dateStr.substring(0,4)}-${dateStr.substring(4,6)}-${dateStr.substring(6,8)}T12:00:00`);
    const isNew = debateDate >= fourDaysAgo;
    card.className = `card debate-card${isNew ? ' card-new' : ''}`;
    
    const councilDisplay = councilLabels[item.council] || item.council;
    const partyDisplay = getPartyDisplay(item);
    
    const textPreview = item.text.length > 400 
        ? item.text.substring(0, 400) + '...' 
        : item.text;
    
    // Lien vers l'intervention
    const votumAnchor = item.sort_order ? `#votum${item.sort_order}` : '';
    const parlLang = isDE ? 'de' : 'fr';
    const bulletinUrl = item.id_subject 
        ? `https://www.parlament.ch/${parlLang}/ratsbetrieb/amtliches-bulletin/amtliches-bulletin-die-verhandlungen?SubjectId=${item.id_subject}${votumAnchor}`
        : null;
    
    // Lien vers l'objet parlementaire
    const curiaVistaUrl = item.affair_id 
        ? `https://www.parlament.ch/${parlLang}/ratsbetrieb/suche-curia-vista/geschaeft?AffairId=${item.affair_id}`
        : null;
    
    const businessNumberLink = (item.business_number && curiaVistaUrl)
        ? `<a href="${curiaVistaUrl}" target="_blank" class="card-id" title="${isDE ? 'Geschäft auf Curia Vista anzeigen' : 'Voir l\'objet sur Curia Vista'}">${item.business_number}</a>`
        : `<span class="card-id">${item.business_number || ''}</span>`;
    
    const businessTitle = isDE ? (item.business_title_de || item.business_title_fr || item.business_title || '') : (item.business_title_fr || item.business_title || '');
    const businessTitleLink = (businessTitle && bulletinUrl)
        ? `<a href="${bulletinUrl}" target="_blank" title="${isDE ? 'Vollständige Intervention anzeigen' : 'Voir l\'intervention complète'}">${businessTitle}</a>`
        : businessTitle;
    
    const speakerText = `${item.speaker} (${partyDisplay}, ${item.canton || ''})`;
    
    card.innerHTML = `
        <div class="card-header">
            ${businessNumberLink}
            <div class="card-badges">
                <span class="badge badge-council">${councilDisplay}</span>
            </div>
        </div>
        <h3 class="card-title">${businessTitleLink}</h3>
        <div class="card-meta">
            <span>💬 ${speakerText}</span>
            <span>📅 ${formatDate(item.date)}</span>
        </div>
        <div class="card-text">${highlightKeywords(textPreview, searchTerm)}</div>
    `;
    
    if (item.text.length > 400) {
        const expandBtn = document.createElement('button');
        expandBtn.className = 'btn-expand';
        expandBtn.textContent = isDE ? 'Mehr anzeigen' : 'Voir plus';
        expandBtn.addEventListener('click', () => {
            const textDiv = card.querySelector('.card-text');
            const showMoreLabel = isDE ? 'Mehr anzeigen' : 'Voir plus';
            const showLessLabel = isDE ? 'Weniger anzeigen' : 'Voir moins';
            if (expandBtn.textContent === showMoreLabel) {
                textDiv.innerHTML = highlightKeywords(item.text, searchTerm);
                expandBtn.textContent = showLessLabel;
            } else {
                textDiv.innerHTML = highlightKeywords(textPreview, searchTerm);
                expandBtn.textContent = showMoreLabel;
            }
        });
        card.appendChild(expandBtn);
    }
    
    return card;
}

function renderResults(loadMore = false) {
    resultsCount.textContent = isDE
        ? `${filteredData.length} Intervention${filteredData.length !== 1 ? 'en' : ''} gefunden`
        : `${filteredData.length} intervention${filteredData.length !== 1 ? 's' : ''} trouvée${filteredData.length !== 1 ? 's' : ''}`;
    
    if (filteredData.length === 0) {
        resultsContainer.innerHTML = `
            <div class="empty-state">
                <h3>${isDE ? 'Keine Ergebnisse' : 'Aucun résultat'}</h3>
                <p>${isDE ? 'Versuchen Sie, Ihre Suchkriterien zu ändern' : 'Essayez de modifier vos critères de recherche'}</p>
            </div>
        `;
        displayedCount = 0;
        return;
    }
    
    const currentSearchTerm = searchInput.value.trim();
    
    if (!loadMore) {
        displayedCount = Math.min(INITIAL_ITEMS, filteredData.length);
        resultsContainer.innerHTML = '';
    } else {
        displayedCount = Math.min(displayedCount + ITEMS_PER_LOAD, filteredData.length);
        const oldBtn = document.getElementById('showMoreBtn');
        if (oldBtn) oldBtn.parentElement.remove();
    }
    
    resultsContainer.innerHTML = '';
    const itemsToShow = filteredData.slice(0, displayedCount);
    itemsToShow.forEach(item => {
        resultsContainer.appendChild(createCard(item, currentSearchTerm));
    });
    
    if (displayedCount < filteredData.length) {
        const remaining = filteredData.length - displayedCount;
        const container = document.createElement('div');
        container.className = 'show-more-container';
        container.innerHTML = `<button id="showMoreBtn" class="btn-show-more">${isDE ? `Mehr anzeigen (${remaining} weitere)` : `Afficher plus (${remaining} restant${remaining > 1 ? 's' : ''})`}</button>`;
        resultsContainer.appendChild(container);
        document.getElementById('showMoreBtn').addEventListener('click', () => renderResults(true));
    }
}

document.addEventListener('DOMContentLoaded', init);
