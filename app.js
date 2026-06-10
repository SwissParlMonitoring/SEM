// Configuration
const DATA_URL = 'sem_migration_data.json';
const EXCEL_URL = 'Objets_parlementaires_SEM_Migration.xlsx';
const INITIAL_ITEMS = 10;
const ITEMS_PER_LOAD = 10;
const isDE = (window.LANG === 'de');

// Catégories thématiques migration/asile
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
        keywords: ['migrationspolitik', 'politique migratoire', 'migrationsabkommen', 'accord migratoire', 'migrationspartnerschaft', 'partenariat migratoire', 'migrationsströme', 'flux migratoire', 'migrationsbehörde', 'sekundärmigration', 'migration secondaire', 'migration illégale', 'illegale migration', 'schengen', 'visum', 'visa', 'grenze', 'frontière', 'staatssekretariat für migration', 'secrétariat d\'état aux migrations', 'migrationskommission', 'commission des migrations']
    }
];

const IT_EXCLUSION_KEYWORDS = ['datenmigration', 'it-migration', 'systemmigration', 'datenbankm', 'softwaremigration', 'cloud-migration', 'migration informatique', 'migration numérique', 'migration des données', 'migration de système'];

function getItemCategories(item) {
    const searchText = [
        item.title, item.title_de, item.text, item.text_de
    ].filter(Boolean).join(' ').toLowerCase();
    
    if (IT_EXCLUSION_KEYWORDS.some(kw => searchText.includes(kw))) return [];
    
    const categories = [];
    for (const cat of THEMATIC_CATEGORIES) {
        if (cat.keywords.some(kw => searchText.includes(kw.toLowerCase()))) {
            categories.push(cat.id);
        }
    }
    return categories;
}

// State
let allData = [];
let filteredData = [];
let displayedCount = 0;
let newIds = [];
let sessionsData = [];
let sortDescending = true;

// DOM Elements
const searchInput = document.getElementById('searchInput');
const clearButton = document.getElementById('clearSearch');
const resultsContainer = document.getElementById('results');
const resultsCount = document.getElementById('resultsCount');
const lastUpdate = document.getElementById('lastUpdate');
const downloadBtn = document.getElementById('downloadBtn');
const resetFiltersBtn = document.getElementById('resetFilters');
const showNewUpdatesBtn = document.getElementById('showNewUpdates');

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
    showLoading();
    try {
        // Charger les données des sessions
        const sessionsResponse = await fetch('sessions.json');
        const sessionsJson = await sessionsResponse.json();
        sessionsData = sessionsJson.sessions || [];
        
        const response = await fetch(DATA_URL);
        const json = await response.json();
        allData = json.items || [];
        // Convertir new_ids en tableau si c'est une string
        let rawNewIds = json.meta?.new_ids || [];
        if (typeof rawNewIds === 'string') {
            newIds = rawNewIds.split(',').map(id => id.trim()).filter(id => id);
        } else {
            newIds = rawNewIds;
        }
        
        // Display last update
        if (json.meta && json.meta.updated) {
            const date = new Date(json.meta.updated);
            lastUpdate.textContent = isDE ? `Aktualisierung: ${date.toLocaleDateString('de-CH')}` : `Mise à jour: ${date.toLocaleDateString('fr-CH')}`;
        }
        
        // Display session summary if available
        displaySessionSummary(json.session_summary);
        
        // Populate filters
        populateYearFilter();
        populatePartyFilter();
        populateDepartmentFilter();
        populateTagsFilter();
        
        // Initialize dropdown filters
        initDropdownFilters();
        
        // Check for search parameter in URL
        const urlParams = new URLSearchParams(window.location.search);
        const searchParam = urlParams.get('search');
        if (searchParam) {
            searchInput.value = searchParam;
        }
        
        // Check for filter parameters from stats page
        const filterParty = urlParams.get('filter_party');
        const filterType = urlParams.get('filter_type');
        const filterYear = urlParams.get('filter_year');
        const filterSession = urlParams.get('filter_session');
        const filterCouncil = urlParams.get('filter_council');
        const filterDept = urlParams.get('filter_dept');
        const filterLegislature = urlParams.get('filter_legislature');
        const filterTags = urlParams.get('filter_tags');
        
        if (filterParty) applyFilterFromUrl('partyDropdown', filterParty);
        if (filterType) applyFilterFromUrl('typeDropdown', filterType);
        if (filterYear) applyFilterFromUrl('yearDropdown', filterYear);
        if (filterCouncil) applyFilterFromUrl('councilDropdown', filterCouncil);
        if (filterDept) applyFilterFromUrl('departmentDropdown', filterDept);
        if (filterLegislature) applyFilterFromUrl('legislatureDropdown', filterLegislature);
        if (filterTags) applyFilterFromUrl('tagsDropdown', filterTags);
        
        const filterMention = urlParams.get('filter_mention');
        if (filterMention) applyFilterFromUrl('mentionDropdown', filterMention);
        
        // Store session filter for use in applyFilters
        window.sessionFilter = filterSession || null;
        
        // Initial display
        filteredData = [...allData];
        applyFilters();
        
        // Setup event listeners
        setupEventListeners();
    } catch (error) {
        console.error('Error loading data:', error);
        showError('Erreur lors du chargement des données');
    }
}

function displaySessionSummary(summary) {
    if (!summary) return;
    
    const today = new Date();
    const displayUntil = summary.display_until ? new Date(summary.display_until) : null;
    
    if (displayUntil && today >= displayUntil) {
        return;
    }
    
    const container = document.getElementById('sessionSummary');
    const titleEl = document.getElementById('summaryTitle');
    const textEl = document.getElementById('summaryText');
    const listEl = document.getElementById('summaryInterventions');
    
    if (!container || !titleEl || !textEl || !listEl) return;
    
    titleEl.textContent = isDE ? (summary.title_de || summary.title_fr) : summary.title_fr;
    const themesLabel = isDE ? 'Behandelte Themen:' : 'Thèmes abordés :';
    const summaryText = isDE ? (summary.text_de || summary.text_fr) : summary.text_fr;
    const summaryThemes = isDE ? (summary.themes_de || summary.themes_fr) : summary.themes_fr;
    textEl.innerHTML = summaryText + (summaryThemes ? `<br><br><strong>${themesLabel}</strong> ` + escapeHtml(summaryThemes) : '');
    
    if (summary.interventions && summary.interventions.shortId) {
        const items = summary.interventions.shortId.map((id, i) => {
            const title = summary.interventions.title[i] || '';
            const author = summary.interventions.author[i] || '';
            const party = translateParty(summary.interventions.party[i] || '');
            const type = summary.interventions.type[i] || '';
            const url = isDE ? (summary.interventions.url_de?.[i] || summary.interventions.url_fr[i] || '#') : (summary.interventions.url_fr[i] || '#');
            const authorWithParty = party ? `${author} (${party})` : author;
            return `<li><a href="${url}" target="_blank">${id}</a> – ${type} – ${escapeHtml(title.substring(0, 60))}${title.length > 60 ? '...' : ''} – <em>${escapeHtml(authorWithParty)}</em></li>`;
        });
        listEl.innerHTML = items.join('');
    }
    
    container.style.display = 'block';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

function getSessionTypeFromDate(dateStr) {
    if (!dateStr || !sessionsData.length) {
        return 'autre';
    }
    
    for (const session of sessionsData) {
        if (dateStr >= session.start && dateStr <= session.end) {
            const parts = session.id.split('-');
            if (parts.length >= 2) {
                const sessionType = parts[1];
                if (sessionType.startsWith('speciale')) return 'speciale';
                if (sessionType === 'printemps') return 'printemps';
                if (sessionType === 'ete') return 'ete';
                if (sessionType === 'automne') return 'automne';
                if (sessionType === 'hiver') return 'hiver';
            }
            return 'autre';
        }
    }
    
    return 'autre';
}

function translateParty(party) {
    if (isDE) {
        const translations = {
            'Al': 'GRÜNE',
            'PSS': 'SP',
            'PS': 'SP',
            'M-E': 'Die Mitte',
            'PDC': 'Die Mitte',
            'PBD': 'Die Mitte',
            'CSPO': 'Die Mitte',
            'CVP': 'Die Mitte',
            'BDP': 'Die Mitte',
            'AI': 'GRÜNE',
            'UDC': 'SVP',
            'PLR': 'FDP',
            'Le Centre': 'Die Mitte',
            'VERT-E-S': 'GRÜNE',
            'Vert\'libéraux': 'GLP',
            'pvl': 'GLP',
            'Indépendant': 'Parteilos',
            'PEV': 'EVP',
            'UDF': 'EDU',
            'PLD': 'LDP',
            'csp-ow': 'Die Mitte'
        };
        return translations[party] || party;
    }
    const translations = {
        'Al': 'VERT-E-S',
        'PSS': 'PS',
        'M-E': 'Le Centre',
        'PDC': 'Le Centre',
        'PBD': 'Le Centre',
        'CSPO': 'Le Centre',
        'CVP': 'Le Centre',
        'BDP': 'Le Centre',
        'AI': 'VERT-E-S',
        'EVP': 'PEV',
        'EDU': 'UDF',
        'LDP': 'PLD',
        'csp-ow': 'Le Centre'
    };
    return translations[party] || party;
}

function translateAuthor(author) {
    if (!author) return '';
    if (isDE) return author;
    const translations = {
        'Sicherheitspolitische Kommission Nationalrat-Nationalrat': 'Commission de la politique de sécurité du Conseil national',
        'Sicherheitspolitische Kommission Nationalrat': 'Commission de la politique de sécurité du Conseil national',
        'Sicherheitspolitische Kommission Ständerat': 'Commission de la politique de sécurité du Conseil des États',
        'Staatspolitische Kommission Nationalrat': 'Commission des institutions politiques du Conseil national',
        'Staatspolitische Kommission Ständerat': 'Commission des institutions politiques du Conseil des États',
        'FDP-Liberale Fraktion': 'Groupe libéral-radical',
        'Grüne Fraktion': 'Groupe des VERT-E-S',
        'Sozialdemokratische Fraktion': 'Groupe socialiste',
        'SVP-Fraktion': 'Groupe de l\'Union démocratique du centre',
        'Fraktion der Schweizerischen Volkspartei': 'Groupe de l\'Union démocratique du centre',
        'Fraktion der Mitte': 'Groupe du Centre',
        'Die Mitte-Fraktion. Die Mitte. EVP.': 'Groupe du Centre',
        'Grünliberale Fraktion': 'Groupe vert\'libéral'
    };
    return translations[author] || author;
}

function getPartyFromAuthor(author) {
    if (!author) return null;
    if (author.includes('FDP') || author.includes('PLR') || author.includes('libéral-radical')) return 'PLR';
    if (author.includes('Grünliberale') || author.includes('vert\'libéral')) return 'pvl';
    if (author.includes('SVP') || author.includes('UDC') || author.includes('Schweizerischen Volkspartei') || author.includes('Union démocratique')) return 'UDC';
    if (author.includes('SP ') || author.includes('PS ') || author.includes('socialiste') || author.includes('Sozialdemokratische')) return 'PSS';
    if (author.includes('Grüne') || author.includes('Verts') || author.includes('VERT')) return 'VERT-E-S';
    if (author.includes('Mitte') || author.includes('Centre') || author.includes('EVP')) return 'Le Centre';
    return null;
}

function getLegislature(date) {
    if (!date) return null;
    if (date >= '2023-12-01') return '52';
    if (date >= '2019-12-01') return '51';
    if (date >= '2015-12-01') return '50';
    return null;
}

function updateLangSwitcherLinks() {
    const searchValue = searchInput.value.trim();
    const langLinks = document.querySelectorAll('.lang-switcher a');
    langLinks.forEach(link => {
        const href = link.getAttribute('href').split('?')[0];
        if (searchValue) {
            link.setAttribute('href', `${href}?search=${encodeURIComponent(searchValue)}`);
        } else {
            link.setAttribute('href', href);
        }
    });
}

function setupEventListeners() {
    searchInput.addEventListener('input', () => {
        debounce(applyFilters, 300)();
        updateLangSwitcherLinks();
    });
    clearButton.addEventListener('click', clearSearch);
    
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadFilteredData);
    }
    
    const sortOrderBtn = document.getElementById('sortOrderBtn');
    if (sortOrderBtn) {
        sortOrderBtn.addEventListener('click', toggleSortOrder);
    }
    
    updateLangSwitcherLinks();
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && searchInput.value) {
            clearSearch();
        }
        if (e.key === '/' && document.activeElement !== searchInput) {
            e.preventDefault();
            searchInput.focus();
        }
    });
}

function populateYearFilter() {
    const yearMenu = document.getElementById('yearMenu');
    const years = [...new Set(allData.map(item => item.date?.substring(0, 4)).filter(Boolean))];
    years.sort((a, b) => b - a);
    
    const allLabel = document.createElement('label');
    allLabel.className = 'select-all';
    allLabel.innerHTML = `<input type="checkbox" data-select-all checked> ${isDE ? 'Alle' : 'Tous'}`;
    yearMenu.appendChild(allLabel);
    
    years.forEach(year => {
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" value="${year}"> ${year}`;
        yearMenu.appendChild(label);
    });
}

function populatePartyFilter() {
    const partyMenu = document.getElementById('partyMenu');
    const translatedParties = [...new Set(allData.map(item => translateParty(item.party)).filter(Boolean))];
    translatedParties.sort((a, b) => a.localeCompare(b, 'fr'));
    
    const allLabel = document.createElement('label');
    allLabel.className = 'select-all';
    allLabel.innerHTML = `<input type="checkbox" data-select-all checked> ${isDE ? 'Alle' : 'Tous'}`;
    partyMenu.appendChild(allLabel);
    
    translatedParties.forEach(party => {
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" value="${party}"> ${party}`;
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
        'VBV': 'AF',
        'AB-BA': 'AS-MPC'
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

function getCheckedValues(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return [];
    const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]:checked:not([data-select-all])');
    return Array.from(checkboxes).map(cb => cb.value).filter(v => v);
}

function updateFilterCount(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    const countSpan = dropdown.querySelector('.filter-count');
    if (!countSpan) return;
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

function initDropdownFilters() {
    const dropdowns = document.querySelectorAll('.filter-dropdown');
    
    dropdowns.forEach(dropdown => {
        const btn = dropdown.querySelector('.filter-btn');
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdowns.forEach(d => {
                if (d !== dropdown) d.classList.remove('open');
            });
            dropdown.classList.toggle('open');
        });
        
        const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => {
            cb.addEventListener('change', (e) => {
                const isSelectAll = e.target.hasAttribute('data-select-all');
                if (isSelectAll && e.target.checked) {
                    dropdown.querySelectorAll('input[type="checkbox"]:not([data-select-all])').forEach(other => {
                        other.checked = false;
                    });
                } else if (!isSelectAll && e.target.checked) {
                    const selectAll = dropdown.querySelector('input[data-select-all]');
                    if (selectAll) selectAll.checked = false;
                }
                updateFilterCount(dropdown.id);
                applyFilters();
            });
        });
    });
    
    document.addEventListener('click', () => {
        dropdowns.forEach(d => d.classList.remove('open'));
    });
    
    document.querySelectorAll('.filter-menu').forEach(menu => {
        menu.addEventListener('click', e => e.stopPropagation());
    });
    
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', resetAllFilters);
    }
    
    if (showNewUpdatesBtn) {
        showNewUpdatesBtn.addEventListener('click', toggleNewUpdatesFilter);
    }
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

function resetAllFilters() {
    document.querySelectorAll('.filter-dropdown input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
    document.querySelectorAll('.filter-dropdown input[data-select-all]').forEach(cb => {
        cb.checked = true;
    });
    document.querySelectorAll('.filter-dropdown').forEach(dropdown => {
        updateFilterCount(dropdown.id);
    });
    searchInput.value = '';
    window.sessionFilter = null;
    window.newUpdatesFilter = false;
    if (showNewUpdatesBtn) {
        showNewUpdatesBtn.classList.remove('active');
    }
    if (window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    applyFilters();
}

function applyFilterFromUrl(dropdownId, filterValue) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    
    const filterValues = filterValue.split(',').map(v => v.trim());
    const selectAll = dropdown.querySelector('input[data-select-all]');
    if (selectAll) selectAll.checked = false;
    
    const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]:not([data-select-all])');
    checkboxes.forEach(cb => {
        if (filterValues.includes(cb.value)) {
            cb.checked = true;
        }
    });
    
    updateFilterCount(dropdownId);
}

function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const typeValues = getCheckedValues('typeDropdown');
    const councilValues = getCheckedValues('councilDropdown');
    const yearValues = getCheckedValues('yearDropdown');
    const partyValues = getCheckedValues('partyDropdown');
    const departmentValues = getCheckedValues('departmentDropdown');
    const tagsValues = getCheckedValues('tagsDropdown');
    const legislatureValues = getCheckedValues('legislatureDropdown');
    const mentionValues = getCheckedValues('mentionDropdown');
    
    filteredData = allData.filter(item => {
        // Text search
        if (searchTerm) {
            const searchFields = [
                item.shortId,
                item.title,
                item.title_de,
                item.author,
                item.type,
                item.status,
                item.text,
                item.text_de
            ].filter(Boolean).join(' ');
            
            if (!searchWholeWord(searchFields, searchTerm)) {
                return false;
            }
        }
        
        if (typeValues.length > 0 && !typeValues.includes(item.type)) return false;
        if (councilValues.length > 0 && !councilValues.includes(item.council)) return false;
        
        if (yearValues.length > 0) {
            const itemYear = item.date?.substring(0, 4);
            if (!yearValues.includes(itemYear)) return false;
        }
        
        if (window.sessionFilter && item.date) {
            const itemSessionType = getSessionTypeFromDate(item.date);
            if (itemSessionType !== window.sessionFilter) return false;
        }
        
        if (window.newUpdatesFilter) {
            const now = new Date();
            const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
            const itemDateStr = item.date_maj || item.date || '';
            const itemDate = itemDateStr ? new Date(itemDateStr + 'T12:00:00') : null;
            const isRecent = itemDate ? itemDate >= fourDaysAgo : false;
            if (!isRecent) return false;
        }
        
        if (partyValues.length > 0) {
            const itemParty = translateParty(item.party) || getPartyFromAuthor(item.author);
            if (!partyValues.includes(itemParty)) return false;
        }
        
        if (departmentValues.length > 0) {
            const itemDept = item.department || 'none';
            if (!departmentValues.includes(itemDept)) return false;
        }
        
        if (tagsValues.length > 0) {
            const itemCategories = getItemCategories(item);
            const hasMatchingCategory = itemCategories.some(cat => tagsValues.includes(cat));
            if (!hasMatchingCategory) return false;
        }
        
        if (legislatureValues.length > 0) {
            const itemLegislature = getLegislature(item.date);
            if (!legislatureValues.includes(itemLegislature)) return false;
        }
        
        // Mention filter (qui cite le thème)
        if (mentionValues.length > 0) {
            const mentionMap = {
                'elu': 'Élu',
                'cf': 'Conseil fédéral',
                'both': 'Élu & Conseil fédéral'
            };
            const itemMention = item.mention || '';
            const matchesMention = mentionValues.some(v => mentionMap[v] === itemMention);
            if (!matchesMention) return false;
        }
        
        return true;
    });
    
    filteredData.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateA !== dateB) {
            return sortDescending ? dateB.localeCompare(dateA) : dateA.localeCompare(dateB);
        }
        const majA = a.date_maj || '';
        const majB = b.date_maj || '';
        if (majA !== majB) {
            return sortDescending ? majB.localeCompare(majA) : majA.localeCompare(majB);
        }
        return sortDescending ? (b.shortId || '').localeCompare(a.shortId || '') : (a.shortId || '').localeCompare(b.shortId || '');
    });
    
    renderResults();
    updateURL();
}

function updateURL() {
    const params = new URLSearchParams();
    const searchTerm = searchInput.value.trim();
    if (searchTerm) params.set('search', searchTerm);
    
    const yearValues = getCheckedValues('yearDropdown');
    if (yearValues.length > 0) params.set('filter_year', yearValues.join(','));
    if (window.sessionFilter) params.set('filter_session', window.sessionFilter);
    
    const typeValues = getCheckedValues('typeDropdown');
    if (typeValues.length > 0) params.set('filter_type', typeValues.join(','));
    
    const councilValues = getCheckedValues('councilDropdown');
    if (councilValues.length > 0) params.set('filter_council', councilValues.join(','));
    
    const partyValues = getCheckedValues('partyDropdown');
    if (partyValues.length > 0) params.set('filter_party', partyValues.join(','));
    
    const departmentValues = getCheckedValues('departmentDropdown');
    if (departmentValues.length > 0) params.set('filter_department', departmentValues.join(','));
    
    const legislatureValues = getCheckedValues('legislatureDropdown');
    if (legislatureValues.length > 0) params.set('filter_legislature', legislatureValues.join(','));
    
    if (window.newUpdatesFilter) params.set('nouveautes', '1');
    
    const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, document.title, newUrl);
}

function clearSearch() {
    searchInput.value = '';
    searchInput.focus();
    applyFilters();
}

function toggleSortOrder() {
    sortDescending = !sortDescending;
    const btn = document.getElementById('sortOrderBtn');
    if (btn) {
        btn.textContent = sortDescending ? (isDE ? '↓ Neuste' : '↓ Récent') : (isDE ? '↑ Älteste' : '↑ Ancien');
    }
    applyFilters();
}

function renderResults(loadMore = false) {
    resultsCount.textContent = isDE
        ? `${filteredData.length} ${filteredData.length !== 1 ? 'Vorstösse' : 'Vorstoss'} gefunden`
        : `${filteredData.length} objet${filteredData.length !== 1 ? 's' : ''} trouvé${filteredData.length !== 1 ? 's' : ''}`;
    
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
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (!loadMore) {
        displayedCount = Math.min(INITIAL_ITEMS, filteredData.length);
        resultsContainer.innerHTML = '';
    } else {
        displayedCount = Math.min(displayedCount + ITEMS_PER_LOAD, filteredData.length);
        const oldBtn = document.getElementById('showMoreBtn');
        if (oldBtn) oldBtn.remove();
    }
    
    const itemsToShow = filteredData.slice(0, displayedCount);
    resultsContainer.innerHTML = itemsToShow.map(item => createCard(item, searchTerm)).join('');
    
    if (displayedCount < filteredData.length) {
        const remaining = filteredData.length - displayedCount;
        resultsContainer.innerHTML += `
            <div class="show-more-container">
                <button id="showMoreBtn" class="btn-show-more">${isDE ? `Mehr anzeigen (${remaining} weitere)` : `Afficher plus (${remaining} restant${remaining > 1 ? 's' : ''})`}</button>
            </div>
        `;
        document.getElementById('showMoreBtn').addEventListener('click', () => renderResults(true));
    }
}

function translateType(type) {
    if (isDE) {
        const translations = {
            'Interpellation': 'Interpellation',
            'Ip.': 'Ip.',
            'Dringliche Interpellation': 'Dringliche Interpellation',
            'D.Ip.': 'D.Ip.',
            'Motion': 'Motion',
            'Mo.': 'Mo.',
            'Fragestunde': 'Fragestunde',
            'Fra.': 'Fragestunde',
            'Geschäft des Bundesrates': 'Geschäft des Bundesrates',
            'Postulat': 'Postulat',
            'Po.': 'Po.',
            'Anfrage': 'Anfrage',
            'A.': 'Anfrage',
            'Parlamentarische Initiative': 'Parlamentarische Initiative',
            'Pa.Iv.': 'Pa. Iv.',
            'Pa. Iv.': 'Pa. Iv.',
            'Iv. pa.': 'Pa. Iv.',
            'Iv. ct.': 'Kt. Iv.',
            'Geschäft des Parlaments': 'Geschäft des Parlaments',
            'Heure des questions': 'Fragestunde',
            'Question': 'Anfrage',
            'Interpellation urgente': 'Dringliche Interpellation',
            'Initiative parlementaire': 'Parlamentarische Initiative',
            'Objet du Conseil fédéral': 'Geschäft des Bundesrates',
            'Kt. Iv.': 'Standesinitiative',
            'Iv. ct.': 'Standesinitiative',
            'Initiative cantonale': 'Standesinitiative',
            'Pet.': 'Petition',
            'Pétition': 'Petition',
            'DA': 'Erklärung',
            'Déclaration': 'Erklärung',
            'PAG': 'Geschäft des Parlaments',
            'Objet du Parlement': 'Geschäft des Parlaments'
        };
        return translations[type] || type;
    }
    const translations = {
        'Interpellation': 'Interpellation',
        'Ip.': 'Ip.',
        'Dringliche Interpellation': 'Interpellation urgente',
        'D.Ip.': 'Ip. urg.',
        'Motion': 'Motion',
        'Mo.': 'Mo.',
        'Fragestunde': 'Heure des questions',
        'Fra.': 'Heure des questions',
        'Geschäft des Bundesrates': 'Objet du Conseil fédéral',
        'Postulat': 'Postulat',
        'Po.': 'Po.',
        'Anfrage': 'Question',
        'A.': 'Question',
        'Parlamentarische Initiative': 'Initiative parlementaire',
        'Pa.Iv.': 'Iv. pa.',
        'Pa. Iv.': 'Iv. pa.',
        'Geschäft des Parlaments': 'Objet du Parlement',
        'Kt. Iv.': 'Iv. ct.',
        'Standesinitiative': 'Initiative cantonale',
        'Pet.': 'Pétition',
        'Petition': 'Pétition',
        'DA': 'Déclaration',
        'Erklärung': 'Déclaration',
        'PAG': 'Objet du Parlement',
        'Geschäft des Parlaments': 'Objet du Parlement'
    };
    return translations[type] || type;
}

function getMentionEmojis(mention) {
    if (!mention) return { emojis: '👤', tooltip: isDE ? 'Der Autor zitiert das Thema' : "L'auteur cite le thème" };
    const hasElu = mention.includes('Élu');
    const hasCF = mention.includes('Conseil fédéral');
    
    if (hasElu && hasCF) {
        return { emojis: '👤 🏛️', tooltip: isDE ? 'Autor und Bundesrat zitieren das Thema' : "L'auteur et le Conseil fédéral citent le thème" };
    } else if (hasCF) {
        return { emojis: '🏛️', tooltip: isDE ? 'Der Bundesrat zitiert das Thema' : "Le Conseil fédéral cite le thème" };
    } else {
        return { emojis: '👤', tooltip: isDE ? 'Der Autor zitiert das Thema' : "L'auteur cite le thème" };
    }
}

function isTitleMissing(title) {
    if (!title) return true;
    const missing = ['titre suit', 'titel folgt', 'titolo segue', ''];
    return missing.includes(title.toLowerCase().trim());
}

function createCard(item, searchTerm) {
    const frMissing = isTitleMissing(item.title);
    const deMissing = isTitleMissing(item.title_de);
    const displayTitle = isDE
        ? (deMissing && !frMissing ? item.title : (item.title_de || item.title || ''))
        : (frMissing && item.title_de ? item.title_de : (item.title || item.title_de || ''));
    const title = highlightText(displayTitle, searchTerm);
    const langWarning = isDE
        ? (deMissing && !frMissing ? '<span class="lang-warning">🌐 Nur auf Französisch</span>' : '')
        : (frMissing && item.title_de ? '<span class="lang-warning">🌐 Uniquement en allemand</span>' : '');
    
    const authorName = translateAuthor(item.author || '');
    const partyFR = translateParty(item.party || '');
    const authorWithParty = partyFR ? `${authorName} (${partyFR})` : authorName;
    const author = highlightText(authorWithParty, searchTerm);
    
    // Bande verte si mise à jour < 4 jours
    const now = new Date();
    const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
    const itemDateStr = item.date_maj || item.date || '';
    const itemDate = itemDateStr ? new Date(itemDateStr + 'T12:00:00') : null;
    const isRecent = itemDate ? itemDate >= fourDaysAgo : false;
    const langRestriction = item.date_maj_langs;
    const isNew = isRecent && (!langRestriction || langRestriction.split(',').includes('fr'));
    const shortId = highlightText(item.shortId, searchTerm);
    
    const date = item.date ? new Date(item.date).toLocaleDateString('fr-CH') : '';
    const dateMaj = item.date_maj ? new Date(item.date_maj).toLocaleDateString('fr-CH') : '';
    const showDateMaj = dateMaj && dateMaj !== date;
    const url = isDE ? (item.url_de || item.url_fr) : (item.url_fr || item.url_de);
    const mentionData = getMentionEmojis(item.mention);
    
    let statusClass = 'badge-status';
    if (item.status?.includes('Erledigt') || item.status?.includes('Liquidé')) {
        statusClass += ' badge-done';
    }
    
    return `
        <article class="card${isNew ? ' card-new' : ''}">
            <div class="card-header">
                <span class="card-id">${shortId}</span>
                <div class="card-badges">
                    <span class="badge badge-type">${translateType(item.type)}</span>
                    <span class="badge badge-council">${isDE ? (item.council === 'NR' ? 'NR' : 'SR') : (item.council === 'NR' ? 'CN' : 'CE')}</span>
                    <span class="badge badge-mention" title="${mentionData.tooltip}">${mentionData.emojis}</span>
                </div>
            </div>
            <h3 class="card-title">
                <a href="${url}" target="_blank" rel="noopener">${title}</a>
            </h3>
            ${langWarning}
            <div class="card-meta">
                <span>👤 ${author}</span>
                <span>📅 ${date}${showDateMaj ? ` · 🔄 ${dateMaj}` : ''}</span>
            </div>
            ${item.status ? `<div style="margin-top: 0.5rem;"><span class="badge ${statusClass}">${getStatusFR(item.status)}</span></div>` : ''}
        </article>
    `;
}

function highlightText(text, searchTerm) {
    if (!text || !searchTerm) return text || '';
    const escapedTerm = escapeRegex(searchTerm);
    const regex = new RegExp(`(\\b${escapedTerm}\\b)`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function searchWholeWord(text, term) {
    if (!text || !term) return false;
    const escapedTerm = escapeRegex(term);
    const regex = new RegExp(`\\b${escapedTerm}\\b`, 'i');
    return regex.test(text);
}

function showLoading() {
    resultsContainer.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
        </div>
    `;
}

function showError(message) {
    resultsContainer.innerHTML = `
        <div class="empty-state">
            <h3>${isDE ? 'Fehler' : 'Erreur'}</h3>
            <p>${message}</p>
        </div>
    `;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function getStatusFR(status) {
    if (!status) return '';
    if (status.includes('/')) {
        return isDE ? status.split('/')[0].trim() : status.split('/')[1].trim();
    }
    return status;
}

function downloadFilteredData() {
    if (filteredData.length === 0) {
        alert(isDE ? 'Keine Daten zum Exportieren' : 'Aucune donnée à exporter');
        return;
    }
    
    const councilMap = isDE ? { 'N': 'NR', 'S': 'SR', 'V': 'BV' } : { 'N': 'CN', 'S': 'CE', 'V': 'AF' };
    const headers = isDE ? ['ID', 'Typ', 'Titel', 'Autor', 'Partei', 'Rat', 'Datum', 'Status', 'Link'] : ['ID', 'Type', 'Titre', 'Auteur', 'Parti', 'Conseil', 'Date', 'Statut', 'Lien'];
    const rows = filteredData.map(item => {
        const frMissing = isTitleMissing(item.title);
        const exportTitle = frMissing && item.title_de ? item.title_de : (item.title || item.title_de || '');
        return [
            item.id || '',
            translateType(item.type) || '',
            exportTitle.replace(/"/g, '""'),
            (translateAuthor(item.author) || '').replace(/"/g, '""'),
            translateParty(item.party) || getPartyFromAuthor(item.author) || '',
            councilMap[item.council] || item.council || '',
            item.date || '',
            getStatusFR(item.status),
            isDE ? (item.url_de || item.url_fr || '') : (item.url_fr || '')
        ];
    });
    
    const csvContent = [
        headers.join(';'),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
    ].join('\n');
    
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Objets_SEM_Migration_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}
