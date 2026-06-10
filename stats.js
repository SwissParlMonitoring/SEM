const isDE = (window.LANG === 'de');

const THEMATIC_CATEGORIES = [
    {
        id: 'asyl',
        label_fr: 'Asile & procédures',
        label_de: 'Asylwesen & Verfahren',
        keywords: ['asyl', 'asile', 'asylwesen', 'asylverfahren', 'asylpolitik', 'asylgesetz', 'asylg', 'dublin', 'härtefallregelung', 'härtefallkommission', 'härtefallbewilligung', 'härtefallklausel', 'procédure d\'asile', 'loi sur l\'asile', 'lasi']
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

function getDebateCategories(item) {
    const searchText = [
        item.business_title_fr, item.business_title_de, item.text
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

let allData = [];
let filteredData = [];
let debatesData = [];
let filteredDebatesData = [];
let sessionsData = [];
let debateTagsMapping = {};
let partyChartInstance = null;
let typeChartInstance = null;
let yearChartInstance = null;
let debatePartyChartInstance = null;
let debateCouncilChartInstance = null;

function downloadChart(canvasId, filename) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

const partyColors = {
    'UDC': '#009F4D',
    'SVP': '#009F4D',
    'PSS': '#E53935',
    'PS': '#E53935',
    'SP': '#E53935',
    'PLR': '#0066CC',
    'FDP': '#0066CC',
    'Le Centre': '#FF9800',
    'Die Mitte': '#FF9800',
    'Centre': '#FF9800',
    'M-E': '#FF9800',
    'PDC': '#FF9800',
    'PBD': '#FF9800',
    'CSPO': '#FF9800',
    'CVP': '#FF9800',
    'BDP': '#FF9800',
    'VERT-E-S': '#8BC34A',
    'GRÜNE': '#8BC34A',
    'Les Vert-e-s': '#8BC34A',
    'Al': '#8BC34A',
    'Vert\'libéraux': '#CDDC39',
    'GLP': '#CDDC39',
    'pvl': '#CDDC39',
    'PVL': '#CDDC39',
    'EVP': '#FFD700',
    'PEV': '#FFD700',
    'EDU': '#7B3F00',
    'UDF': '#7B3F00',
    'LDP': '#0066CC',
    'PLD': '#0066CC'
};

const partyLabels = isDE ? {
    'UDC': 'SVP',
    'PSS': 'SP',
    'PS': 'SP',
    'PLR': 'FDP',
    'Le Centre': 'Die Mitte',
    'Die Mitte': 'Die Mitte',
    'Centre': 'Die Mitte',
    'M-E': 'Die Mitte',
    'PDC': 'Die Mitte',
    'PBD': 'Die Mitte',
    'CSPO': 'Die Mitte',
    'CVP': 'Die Mitte',
    'BDP': 'Die Mitte',
    'VERT-E-S': 'GRÜNE',
    'Les Vert-e-s': 'GRÜNE',
    'Al': 'GRÜNE',
    'pvl': 'GLP',
    'PVL': 'GLP',
    'SVP': 'SVP',
    'SP': 'SP',
    'FDP': 'FDP',
    'GRÜNE': 'GRÜNE',
    'GLP': 'GLP',
    'EVP': 'EVP',
    'PEV': 'EVP',
    'EDU': 'EDU',
    'UDF': 'EDU',
    'LDP': 'LDP',
    'PLD': 'LDP'
} : {
    'UDC': 'UDC',
    'PSS': 'PS',
    'PS': 'PS',
    'PLR': 'PLR',
    'Le Centre': 'Le Centre',
    'Centre': 'Le Centre',
    'M-E': 'Le Centre',
    'PDC': 'Le Centre',
    'PBD': 'Le Centre',
    'CSPO': 'Le Centre',
    'CVP': 'Le Centre',
    'BDP': 'Le Centre',
    'VERT-E-S': 'VERT-E-S',
    'Les Vert-e-s': 'VERT-E-S',
    'Al': 'VERT-E-S',
    'pvl': 'Vert\'libéraux',
    'PVL': 'Vert\'libéraux',
    'EVP': 'PEV',
    'PEV': 'PEV',
    'EDU': 'UDF',
    'UDF': 'UDF',
    'LDP': 'PLD',
    'PLD': 'PLD'
};

const typeLabels = isDE ? {
    'Mo.': 'Motion',
    'Po.': 'Postulat',
    'Ip.': 'Interpellation',
    'Fra.': 'Fragestunde',
    'A.': 'Anfrage',
    'Pa. Iv.': 'Pa. Iv.',
    'D.Ip.': 'D. Interpellation',
    'BRG': 'Geschäft BR',
    'Kt. Iv.': 'Standesinitiative',
    'Pet.': 'Petition',
    'DA': 'Erklärung',
    'PAG': 'Geschäft Parl.'
} : {
    'Mo.': 'Motion',
    'Po.': 'Postulat',
    'Ip.': 'Interpellation',
    'Fra.': 'Heure des questions',
    'A.': 'Question',
    'Pa. Iv.': 'Initiative parl.',
    'D.Ip.': 'Interpellation urgente',
    'BRG': 'Objet du CF',
    'Kt. Iv.': 'Initiative cantonale',
    'Pet.': 'Pétition',
    'DA': 'Déclaration',
    'PAG': 'Objet du Parlement'
};

function translateDept(deptDE) {
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

const typeToFilter = isDE ? {
    'Motion': 'Mo.',
    'Postulat': 'Po.',
    'Interpellation': 'Ip.',
    'Fragestunde': 'Fra.',
    'Anfrage': 'A.',
    'Pa. Iv.': 'Pa. Iv.',
    'D. Interpellation': 'D.Ip.',
    'Geschäft BR': 'BRG',
    'Standesinitiative': 'Kt. Iv.',
    'Petition': 'Pet.',
    'Erklärung': 'DA',
    'Geschäft Parl.': 'PAG'
} : {
    'Motion': 'Mo.',
    'Postulat': 'Po.',
    'Interpellation': 'Ip.',
    'Heure des questions': 'Fra.',
    'Question': 'A.',
    'Initiative parl.': 'Pa. Iv.',
    'Interpellation urgente': 'D.Ip.',
    'Objet du CF': 'BRG',
    'Initiative cantonale': 'Kt. Iv.',
    'Pétition': 'Pet.',
    'Déclaration': 'DA',
    'Objet du Parlement': 'PAG'
};

const partyToFilter = {
    'PS': 'PS',
    'UDC': 'UDC',
    'PLR': 'PLR',
    'Le Centre': 'Le Centre',
    'Verts': 'VERT-E-S',
    'Vert\'libéraux': 'pvl'
};

async function init() {
    try {
        const sessionsResponse = await fetch('sessions.json');
        const sessionsJson = await sessionsResponse.json();
        sessionsData = sessionsJson.sessions || [];
        
        const response = await fetch('sem_migration_data.json');
        const data = await response.json();
        allData = data.items || [];
        filteredData = [...allData];
        
        // Créer le mapping des tags pour les débats
        allData.forEach(item => {
            if (item.shortId && item.tags) {
                debateTagsMapping[item.shortId] = item.tags;
            }
        });
        
        populateObjectFilters();
        setupObjectFilterListeners();
        renderAllObjectCharts();
        
        const debatesResponse = await fetch('debates_data.json');
        const debatesJson = await debatesResponse.json();
        debatesData = debatesJson.items || [];
        debatesData.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        filteredDebatesData = [...debatesData];
        
        populateDebateFilters();
        setupDebateFilterListeners();
        renderAllDebateCharts();
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function getCheckedValues(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]:not([data-select-all])');
    const selectAll = dropdown.querySelector('[data-select-all]');
    if (selectAll && selectAll.checked) return [];
    return Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
}

function setupDropdown(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    const btn = dropdown.querySelector('.filter-btn');
    const menu = dropdown.querySelector('.filter-menu');
    const selectAll = dropdown.querySelector('[data-select-all]');
    const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]:not([data-select-all])');
    const countSpan = dropdown.querySelector('.filter-count');
    
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.filter-dropdown.open').forEach(d => {
            if (d !== dropdown) d.classList.remove('open');
        });
        dropdown.classList.toggle('open');
    });
    
    function updateCount() {
        const checkedBoxes = Array.from(checkboxes).filter(cb => cb.checked);
        if (selectAll && selectAll.checked) {
            countSpan.textContent = '';
        } else if (checkedBoxes.length > 0) {
            const selectedLabels = checkedBoxes.map(cb => cb.parentElement.textContent.trim());
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
    
    if (selectAll) {
        selectAll.addEventListener('change', () => {
            checkboxes.forEach(cb => cb.checked = false);
            updateCount();
        });
    }
    
    checkboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            if (cb.checked && selectAll) selectAll.checked = false;
            if (!Array.from(checkboxes).some(c => c.checked) && selectAll) selectAll.checked = true;
            updateCount();
        });
    });
    
    updateCount();
}

function populateObjectFilters() {
    const yearMenu = document.getElementById('objectYearMenu');
    const years = [...new Set(allData.map(d => d.date ? d.date.substring(0, 4) : null).filter(Boolean))];
    years.sort().reverse();
    years.forEach(year => {
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" value="${year}"> ${year}`;
        yearMenu.appendChild(label);
    });
    
    const partyMenu = document.getElementById('objectPartyMenu');
    const parties = [...new Set(allData.map(d => {
        const party = d.party || getPartyFromAuthor(d.author);
        return normalizeParty(party);
    }).filter(Boolean))];
    parties.sort((a, b) => a.localeCompare(b, 'fr'));
    parties.forEach(party => {
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" value="${party}"> ${party}`;
        partyMenu.appendChild(label);
    });
    
    const deptMenu = document.getElementById('objectDeptMenu');
    if (deptMenu) {
        const departments = [...new Set(allData.map(d => d.department).filter(Boolean))];
        departments.sort((a, b) => translateDept(a).localeCompare(translateDept(b), 'fr'));
        departments.forEach(dept => {
            const label = document.createElement('label');
            const deptFR = translateDept(dept);
            label.innerHTML = `<input type="checkbox" value="${dept}"> ${deptFR}`;
            deptMenu.appendChild(label);
        });
    }
    
    const tagsMenu = document.getElementById('objectTagsMenu');
    if (tagsMenu) {
        THEMATIC_CATEGORIES.forEach(cat => {
            const label = document.createElement('label');
            const displayLabel = isDE ? cat.label_de : cat.label_fr;
            label.innerHTML = `<input type="checkbox" value="${cat.id}"> ${displayLabel}`;
            tagsMenu.appendChild(label);
        });
    }
    
    setupDropdown('objectYearDropdown');
    setupDropdown('objectCouncilDropdown');
    setupDropdown('objectPartyDropdown');
    setupDropdown('objectDeptDropdown');
    setupDropdown('objectTagsDropdown');
    setupDropdown('objectMentionDropdown');
    setupDropdown('objectLegislatureDropdown');
}

function setupObjectFilterListeners() {
    ['objectYearDropdown', 'objectCouncilDropdown', 'objectPartyDropdown', 'objectDeptDropdown', 'objectTagsDropdown', 'objectMentionDropdown', 'objectLegislatureDropdown'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', applyObjectFilters);
    });
    document.getElementById('resetObjectFilters').addEventListener('click', resetObjectFilters);
}

function resetObjectFilters() {
    ['objectYearDropdown', 'objectCouncilDropdown', 'objectPartyDropdown', 'objectDeptDropdown', 'objectTagsDropdown', 'objectMentionDropdown', 'objectLegislatureDropdown'].forEach(id => {
        const dropdown = document.getElementById(id);
        if (!dropdown) return;
        const selectAll = dropdown.querySelector('[data-select-all]');
        const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]:not([data-select-all])');
        if (selectAll) selectAll.checked = true;
        checkboxes.forEach(cb => cb.checked = false);
        const countSpan = dropdown.querySelector('.filter-count');
        if (countSpan) countSpan.textContent = '';
    });
    applyObjectFilters();
}

function getLegislature(date) {
    if (!date) return null;
    if (date >= '2023-12-01') return '52';
    if (date >= '2019-12-01') return '51';
    if (date >= '2015-12-01') return '50';
    return null;
}

function getLegislatureFromSession(sessionId) {
    if (!sessionId) return null;
    const sessionStr = String(sessionId);
    if (sessionStr.startsWith('52')) return '52';
    if (sessionStr.startsWith('51')) return '51';
    if (sessionStr.startsWith('50')) return '50';
    return null;
}

function applyObjectFilters() {
    const yearFilters = getCheckedValues('objectYearDropdown');
    const councilFilters = getCheckedValues('objectCouncilDropdown');
    const partyFilters = getCheckedValues('objectPartyDropdown');
    const deptFilters = getCheckedValues('objectDeptDropdown');
    const tagsFilters = getCheckedValues('objectTagsDropdown');
    const mentionFilters = getCheckedValues('objectMentionDropdown');
    const legislatureFilters = getCheckedValues('objectLegislatureDropdown');
    
    filteredData = allData.filter(item => {
        if (yearFilters.length > 0 && item.date) {
            const year = item.date.substring(0, 4);
            if (!yearFilters.includes(year)) return false;
        }
        if (councilFilters.length > 0) {
            const councilCode = item.council === 'NR' ? 'N' : item.council === 'SR' ? 'S' : item.council;
            if (!councilFilters.includes(councilCode)) return false;
        }
        if (partyFilters.length > 0) {
            const itemParty = item.party || getPartyFromAuthor(item.author);
            const normalizedParty = normalizeParty(itemParty);
            if (!partyFilters.includes(normalizedParty)) return false;
        }
        if (deptFilters.length > 0) {
            const itemDept = item.department || 'none';
            if (!deptFilters.includes(itemDept)) return false;
        }
        if (tagsFilters.length > 0) {
            const itemCategories = getItemCategories(item);
            const hasMatchingCategory = itemCategories.some(cat => tagsFilters.includes(cat));
            if (!hasMatchingCategory) return false;
        }
        if (mentionFilters.length > 0) {
            const mentionMap = {
                'elu': 'Élu',
                'cf': 'Conseil fédéral',
                'both': 'Élu & Conseil fédéral'
            };
            const itemMention = item.mention || '';
            const matchesMention = mentionFilters.some(v => mentionMap[v] === itemMention);
            if (!matchesMention) return false;
        }
        if (legislatureFilters.length > 0) {
            const itemLegislature = getLegislature(item.date);
            if (!legislatureFilters.includes(itemLegislature)) return false;
        }
        return true;
    });
    
    renderAllObjectCharts();
}

function buildObjectsUrl(additionalFilter = {}) {
    const params = new URLSearchParams();
    const yearFilters = getCheckedValues('objectYearDropdown');
    const councilFilters = getCheckedValues('objectCouncilDropdown');
    const partyFilters = getCheckedValues('objectPartyDropdown');
    const deptFilters = getCheckedValues('objectDeptDropdown');
    const tagsFilters = getCheckedValues('objectTagsDropdown');
    const mentionFilters = getCheckedValues('objectMentionDropdown');
    const legislatureFilters = getCheckedValues('objectLegislatureDropdown');
    
    if (yearFilters.length > 0) params.set('filter_year', yearFilters.join(','));
    if (councilFilters.length > 0) params.set('filter_council', councilFilters.join(','));
    if (partyFilters.length > 0) params.set('filter_party', partyFilters.join(','));
    if (deptFilters.length > 0) params.set('filter_dept', deptFilters.join(','));
    if (tagsFilters.length > 0) params.set('filter_tags', tagsFilters.join(','));
    if (mentionFilters.length > 0) params.set('filter_mention', mentionFilters.join(','));
    if (legislatureFilters.length > 0) params.set('filter_legislature', legislatureFilters.join(','));
    
    if (additionalFilter.year) params.set('filter_year', additionalFilter.year);
    if (additionalFilter.council) params.set('filter_council', additionalFilter.council);
    if (additionalFilter.party) params.set('filter_party', additionalFilter.party);
    if (additionalFilter.type) params.set('filter_type', additionalFilter.type);
    if (additionalFilter.session) params.set('filter_session', additionalFilter.session);
    
    const queryString = params.toString();
    const objectsPage = isDE ? 'objects_de.html' : 'objects.html';
    return `${objectsPage}${queryString ? '?' + queryString : ''}`;
}

function renderAllObjectCharts() {
    renderPartyChart();
    renderTypeChart();
    renderYearChart();
    renderTopAuthors();
    updateGlobalSummary();
}

const _w = isDE ? 'Winter' : 'Hiver';
const _sp = isDE ? 'Frühling' : 'Printemps';
const _spe = isDE ? 'Sondersession' : 'Spéciale';
const _su = isDE ? 'Sommer' : 'Été';
const _au = isDE ? 'Herbst' : 'Automne';

const sessionTypes = {
    '5001': _w, '5002': _sp, '5003': _spe, '5004': _su, '5005': _au,
    '5006': _w, '5007': _sp, '5008': _spe, '5009': _su, '5010': _au,
    '5011': _w, '5012': _sp, '5013': _su, '5014': _au,
    '5015': _w, '5016': _sp, '5017': _spe, '5018': _su, '5019': _au,
    '5101': _w, '5102': _sp, '5103': _spe, '5104': _su, '5105': _au,
    '5106': _spe, '5107': _w, '5108': _sp, '5109': _spe, '5110': _su,
    '5111': _au, '5112': _w, '5113': _sp, '5114': _spe, '5115': _su,
    '5116': _au, '5117': _w, '5118': _sp, '5119': _spe, '5120': _spe,
    '5121': _su, '5122': _au,
    '5201': _w, '5202': _sp, '5203': _spe, '5204': _su, '5205': _au,
    '5206': _w, '5207': _sp, '5208': _spe, '5209': _su, '5210': _au,
    '5211': _w, '5212': _sp, '5213': _spe, '5214': _su, '5215': _au,
    '5216': _w, '5217': _sp, '5218': _spe
};

function populateDebateFilters() {
    const yearMenu = document.getElementById('debateYearMenu');
    const years = [...new Set(debatesData.map(d => d.date ? d.date.substring(0, 4) : null).filter(Boolean))];
    years.sort().reverse();
    years.forEach(year => {
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" value="${year}"> ${year}`;
        yearMenu.appendChild(label);
    });
    
    const partyMenu = document.getElementById('debatePartyMenu');
    const cfLabel = isDE ? 'Bundesrat' : 'Conseil fédéral';
    const parties = [...new Set(debatesData.map(d => {
        if (!d.party) return cfLabel;
        return debatePartyLabels[d.party] || d.party;
    }))];
    parties.sort((a, b) => a.localeCompare(b, isDE ? 'de' : 'fr'));
    parties.forEach(party => {
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" value="${party}"> ${party}`;
        partyMenu.appendChild(label);
    });
    
    const deptMenu = document.getElementById('debateDeptMenu');
    if (deptMenu) {
        const departments = [...new Set(debatesData.map(d => d.department).filter(Boolean))];
        departments.sort((a, b) => translateDept(a).localeCompare(translateDept(b), 'fr'));
        departments.forEach(dept => {
            const label = document.createElement('label');
            const deptFR = translateDept(dept);
            label.innerHTML = `<input type="checkbox" value="${dept}"> ${deptFR}`;
            deptMenu.appendChild(label);
        });
    }
    
    const tagsMenu = document.getElementById('debateTagsMenu');
    if (tagsMenu) {
        THEMATIC_CATEGORIES.forEach(cat => {
            const label = document.createElement('label');
            const displayLabel = isDE ? cat.label_de : cat.label_fr;
            label.innerHTML = `<input type="checkbox" value="${cat.id}"> ${displayLabel}`;
            tagsMenu.appendChild(label);
        });
    }
    
    setupDropdown('debateYearDropdown');
    setupDropdown('debateSessionDropdown');
    setupDropdown('debateCouncilDropdown');
    setupDropdown('debatePartyDropdown');
    setupDropdown('debateDeptDropdown');
    setupDropdown('debateTagsDropdown');
    setupDropdown('debateLegislatureDropdown');
}

function setupDebateFilterListeners() {
    ['debateYearDropdown', 'debateSessionDropdown', 'debateCouncilDropdown', 'debatePartyDropdown', 'debateDeptDropdown', 'debateTagsDropdown', 'debateLegislatureDropdown'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', applyDebateFilters);
    });
    document.getElementById('resetDebateFilters').addEventListener('click', resetDebateFilters);
}

function resetDebateFilters() {
    ['debateYearDropdown', 'debateSessionDropdown', 'debateCouncilDropdown', 'debatePartyDropdown', 'debateDeptDropdown', 'debateTagsDropdown', 'debateLegislatureDropdown'].forEach(id => {
        const dropdown = document.getElementById(id);
        if (!dropdown) return;
        const selectAll = dropdown.querySelector('[data-select-all]');
        const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]:not([data-select-all])');
        if (selectAll) selectAll.checked = true;
        checkboxes.forEach(cb => cb.checked = false);
        const countSpan = dropdown.querySelector('.filter-count');
        if (countSpan) countSpan.textContent = '';
    });
    applyDebateFilters();
}

function filterByLegislature(legValue) {
    const objDropdown = document.getElementById('objectLegislatureDropdown');
    if (objDropdown) {
        const selectAll = objDropdown.querySelector('[data-select-all]');
        if (selectAll) selectAll.checked = false;
        objDropdown.querySelectorAll('input[type="checkbox"]:not([data-select-all])').forEach(cb => {
            cb.checked = (cb.value === legValue);
        });
        const countSpan = objDropdown.querySelector('.filter-count');
        if (countSpan) countSpan.textContent = '(1)';
    }
    
    const debDropdown = document.getElementById('debateLegislatureDropdown');
    if (debDropdown) {
        const selectAll = debDropdown.querySelector('[data-select-all]');
        if (selectAll) selectAll.checked = false;
        debDropdown.querySelectorAll('input[type="checkbox"]:not([data-select-all])').forEach(cb => {
            cb.checked = (cb.value === legValue);
        });
        const countSpan = debDropdown.querySelector('.filter-count');
        if (countSpan) countSpan.textContent = '(1)';
    }
    
    applyObjectFilters();
    applyDebateFilters();
}

function filterDebatesByCouncil(councilCode) {
    const dropdown = document.getElementById('debateCouncilDropdown');
    if (!dropdown) return;
    
    const selectAll = dropdown.querySelector('[data-select-all]');
    if (selectAll) selectAll.checked = false;
    const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]:not([data-select-all])');
    checkboxes.forEach(cb => {
        cb.checked = (cb.value === councilCode);
    });
    
    const countSpan = dropdown.querySelector('.filter-count');
    if (countSpan) countSpan.textContent = '(1)';
    
    applyDebateFilters();
    
    const debatesSection = document.getElementById('debatesSection');
    if (debatesSection) debatesSection.scrollIntoView({ behavior: 'smooth' });
}

function applyDebateFilters() {
    const yearFilters = getCheckedValues('debateYearDropdown');
    const sessionFilters = getCheckedValues('debateSessionDropdown');
    const councilFilters = getCheckedValues('debateCouncilDropdown');
    const partyFilters = getCheckedValues('debatePartyDropdown');
    const deptFilters = getCheckedValues('debateDeptDropdown');
    const tagsFilters = getCheckedValues('debateTagsDropdown');
    const legislatureFilters = getCheckedValues('debateLegislatureDropdown');
    
    filteredDebatesData = debatesData.filter(item => {
        if (yearFilters.length > 0 && item.date) {
            const year = item.date.substring(0, 4);
            if (!yearFilters.includes(year)) return false;
        }
        if (sessionFilters.length > 0) {
            const sessionType = sessionTypes[item.id_session];
            if (!sessionFilters.includes(sessionType)) return false;
        }
        if (councilFilters.length > 0 && !councilFilters.includes(item.council)) return false;
        if (partyFilters.length > 0) {
            const itemParty = item.party ? (debatePartyLabels[item.party] || item.party) : (isDE ? 'Bundesrat' : 'Conseil fédéral');
            if (!partyFilters.includes(itemParty)) return false;
        }
        if (deptFilters.length > 0) {
            const itemDept = item.department || 'none';
            if (!deptFilters.includes(itemDept)) return false;
        }
        if (tagsFilters.length > 0) {
            const itemCategories = getDebateCategories(item);
            const hasMatchingCategory = itemCategories.some(cat => tagsFilters.includes(cat));
            if (!hasMatchingCategory) return false;
        }
        if (legislatureFilters.length > 0) {
            const itemLegislature = getLegislatureFromSession(item.id_session);
            if (!legislatureFilters.includes(itemLegislature)) return false;
        }
        return true;
    });
    
    filteredDebatesData.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    renderAllDebateCharts();
}

function buildDebatesUrl(additionalFilter = {}) {
    const params = new URLSearchParams();
    const yearFilters = getCheckedValues('debateYearDropdown');
    const sessionFilters = getCheckedValues('debateSessionDropdown');
    const councilFilters = getCheckedValues('debateCouncilDropdown');
    const partyFilters = getCheckedValues('debatePartyDropdown');
    const deptFilters = getCheckedValues('debateDeptDropdown');
    const tagsFilters = getCheckedValues('debateTagsDropdown');
    const legislatureFilters = getCheckedValues('debateLegislatureDropdown');
    
    if (yearFilters.length > 0) params.set('filter_year', yearFilters.join(','));
    if (sessionFilters.length > 0) params.set('filter_session', sessionFilters.join(','));
    if (councilFilters.length > 0) params.set('filter_council', councilFilters.join(','));
    if (partyFilters.length > 0) params.set('filter_party', partyFilters.join(','));
    if (deptFilters.length > 0) params.set('filter_dept', deptFilters.join(','));
    if (tagsFilters.length > 0) params.set('filter_tags', tagsFilters.join(','));
    if (legislatureFilters.length > 0) params.set('filter_legislature', legislatureFilters.join(','));
    
    if (additionalFilter.council) params.set('filter_council', additionalFilter.council);
    if (additionalFilter.party) params.set('filter_party', additionalFilter.party);
    
    const queryString = params.toString();
    const debatesPage = isDE ? 'debates_de.html' : 'debates.html';
    return `${debatesPage}${queryString ? '?' + queryString : ''}`;
}

function renderAllDebateCharts() {
    renderDebatePartyChart();
    renderDebateCouncilChart();
    renderTopSpeakers();
    renderTopSpeakersNoCF();
    updateGlobalSummary();
}

function updateGlobalSummary() {
    const objectsCountEl = document.getElementById('globalObjectsCount');
    const debatesCountEl = document.getElementById('globalDebatesCount');
    const periodEl = document.getElementById('globalPeriod');
    
    if (objectsCountEl) objectsCountEl.textContent = filteredData.length;
    
    // Calculer les % de qui cite le thème (inclusif : "les deux" compte pour chacun)
    const pctEluEl = document.getElementById('pctElu');
    const pctCFEl = document.getElementById('pctCF');
    const bothNoteEl = document.getElementById('mentionBothNote');
    
    if (pctEluEl && pctCFEl && filteredData.length > 0) {
        const both = filteredData.filter(item => item.mention === 'Élu & Conseil fédéral').length;
        const eluInclusive = filteredData.filter(item => item.mention === 'Élu' || item.mention === 'Élu & Conseil fédéral').length;
        const cfInclusive = filteredData.filter(item => item.mention === 'Conseil fédéral' || item.mention === 'Élu & Conseil fédéral').length;
        
        pctEluEl.textContent = eluInclusive;
        pctCFEl.textContent = cfInclusive;
        
        if (bothNoteEl && both > 0) {
            bothNoteEl.textContent = `dont ${both} par les deux`;
        }
    }
    
    if (debatesCountEl) debatesCountEl.textContent = filteredDebatesData.length;
    
    // Sous-infos débats : répartition CN / CE / AF
    const debatesCNEl = document.getElementById('debatesCN');
    const debatesCEEl = document.getElementById('debatesCE');
    const debatesAFEl = document.getElementById('debatesAF');
    if (debatesCNEl && debatesCEEl && filteredDebatesData.length > 0) {
        const cn = filteredDebatesData.filter(d => d.council === 'N').length;
        const ce = filteredDebatesData.filter(d => d.council === 'S').length;
        const af = filteredDebatesData.filter(d => d.council === 'V').length;
        debatesCNEl.textContent = cn;
        debatesCEEl.textContent = ce;
        if (debatesAFEl) debatesAFEl.textContent = af;
    }
    
    if (periodEl) {
        const years = new Set();
        filteredData.forEach(item => {
            if (item.date) years.add(item.date.substring(0, 4));
        });
        filteredDebatesData.forEach(item => {
            if (item.date) years.add(item.date.substring(0, 4));
        });
        
        if (years.size === 0) {
            periodEl.textContent = '2015 - 2026';
        } else {
            const sorted = [...years].sort();
            if (sorted.length === 1) {
                periodEl.textContent = sorted[0];
            } else {
                periodEl.textContent = `${sorted[0]} - ${sorted[sorted.length - 1]}`;
            }
        }
    }
    
    const legislatures = new Set();
    filteredData.forEach(item => {
        const leg = getLegislature(item.date);
        if (leg) legislatures.add(leg);
    });
    filteredDebatesData.forEach(item => {
        const leg = getLegislatureFromSession(item.id_session);
        if (leg) legislatures.add(leg);
    });
    ['50', '51', '52'].forEach(num => {
        const el = document.getElementById('leg' + num);
        if (el) {
            const isActive = legislatures.has(num) || legislatures.size === 0;
            el.style.opacity = isActive ? '1' : '0.3';
        }
    });
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

function normalizeParty(party) {
    const normalized = {
        'PSS': 'PS',
        'PS': 'PS',
        'VERT-E-S': 'VERT-E-S',
        'Les Vert-e-s': 'VERT-E-S',
        'Al': 'VERT-E-S',
        'pvl': 'Vert\'libéraux',
        'PVL': 'Vert\'libéraux',
        'Le Centre': 'Le Centre',
        'Centre': 'Le Centre',
        'M-E': 'Le Centre',
        'PDC': 'Le Centre',
        'PBD': 'Le Centre',
        'CSPO': 'Le Centre',
        'CVP': 'Le Centre',
        'BDP': 'Le Centre'
    };
    return normalized[party] || party;
}

function getSessionTypeFromDate(dateStr) {
    if (!dateStr || !sessionsData.length) return 'autre';
    
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

function renderPartyChart() {
    if (partyChartInstance) partyChartInstance.destroy();
    
    const partyCounts = {};
    filteredData.forEach(item => {
        let party = item.party || getPartyFromAuthor(item.author);
        if (party) {
            party = normalizeParty(party);
            partyCounts[party] = (partyCounts[party] || 0) + 1;
        }
    });
    
    const sortedParties = Object.entries(partyCounts).sort((a, b) => b[1] - a[1]);
    const labels = sortedParties.map(([party]) => party);
    const data = sortedParties.map(([, count]) => count);
    const colors = labels.map(party => {
        for (const [key, color] of Object.entries(partyColors)) {
            if (normalizeParty(key) === party) return color;
        }
        return '#999';
    });
    
    const ctx = document.getElementById('partyChart').getContext('2d');
    partyChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Interventions',
                data: data,
                backgroundColor: colors,
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const party = labels[index];
                    const filterValue = partyToFilter[party] || party;
                    window.location.href = buildObjectsUrl({ party: filterValue });
                }
            }
        }
    });
}

function renderTypeChart() {
    if (typeChartInstance) typeChartInstance.destroy();
    
    const typeCounts = {};
    filteredData.forEach(item => {
        const type = item.type;
        if (type) {
            const label = typeLabels[type] || type;
            typeCounts[label] = (typeCounts[label] || 0) + 1;
        }
    });
    
    const labels = Object.keys(typeCounts);
    const data = Object.values(typeCounts);
    const colors = ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#795548', '#607D8B', '#E91E63'];
    
    const ctx = document.getElementById('typeChart').getContext('2d');
    typeChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    onClick: (event, legendItem) => {
                        const index = legendItem.index;
                        const typeLabel = labels[index];
                        const filterValue = typeToFilter[typeLabel] || typeLabel;
                        window.location.href = buildObjectsUrl({ type: filterValue });
                    }
                }
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const typeLabel = labels[index];
                    const filterValue = typeToFilter[typeLabel] || typeLabel;
                    window.location.href = buildObjectsUrl({ type: filterValue });
                }
            }
        }
    });
}

// Plugin pour effet pulsation sur les points
const pulsePlugin = {
    id: 'pulseEffect',
    afterDraw: (chart) => {
        const ctx = chart.ctx;
        const meta = chart.getDatasetMeta(0);
        if (!meta.data) return;
        
        const time = Date.now() / 1000;
        const pulseRadius = 8 + Math.sin(time * 3) * 4;
        const pulseOpacity = 0.3 + Math.sin(time * 3) * 0.2;
        
        meta.data.forEach((point) => {
            const x = point.x;
            const y = point.y;
            ctx.beginPath();
            ctx.arc(x, y, pulseRadius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(45, 106, 143, ${pulseOpacity})`;
            ctx.fill();
            ctx.closePath();
        });
        
        requestAnimationFrame(() => chart.draw());
    }
};

function renderYearChart() {
    if (yearChartInstance) yearChartInstance.destroy();
    
    const yearCounts = {};
    filteredData.forEach(item => {
        if (item.date) {
            const year = item.date.substring(0, 4);
            yearCounts[year] = (yearCounts[year] || 0) + 1;
        }
    });
    
    const sortedYears = Object.entries(yearCounts).sort((a, b) => a[0].localeCompare(b[0]));
    const labels = sortedYears.map(([year]) => year);
    const data = sortedYears.map(([, count]) => count);
    
    const ctx = document.getElementById('yearChart').getContext('2d');
    yearChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Interventions',
                data: data,
                borderColor: '#2196F3',
                backgroundColor: 'rgba(45, 106, 143, 0.1)',
                fill: true,
                tension: 0.3,
                pointRadius: 6,
                pointBackgroundColor: '#2D6A8F',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 10,
                pointHitRadius: 15
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const year = labels[index];
                    showSessionDetail(year);
                }
            }
        },
        plugins: [pulsePlugin]
    });
}

function showSessionDetail(year) {
    const detailContainer = document.getElementById('sessionDetail');
    const titleEl = document.getElementById('sessionDetailTitle');
    const contentEl = document.getElementById('sessionDetailContent');
    
    if (!detailContainer) return;
    
    const sessionCounts = {};
    filteredData.forEach(item => {
        if (item.date && item.date.startsWith(year)) {
            const sessionKey = getSessionTypeFromDate(item.date);
            sessionCounts[sessionKey] = (sessionCounts[sessionKey] || 0) + 1;
        }
    });
    
    titleEl.textContent = isDE ? `Detail ${year} nach Session` : `Détail ${year} par session`;
    
    const sessionLabels = isDE ? {
        'printemps': 'Frühlingssession',
        'speciale': 'Sondersession',
        'ete': 'Sommersession',
        'automne': 'Herbstsession',
        'hiver': 'Wintersession',
        'autre': 'Ausserhalb Session'
    } : {
        'printemps': 'Session de printemps',
        'speciale': 'Session spéciale',
        'ete': 'Session d\'été',
        'automne': 'Session d\'automne',
        'hiver': 'Session d\'hiver',
        'autre': 'Hors session'
    };
    
    let html = '<div class="session-detail-grid">';
    const orderedKeys = ['printemps', 'speciale', 'ete', 'automne', 'hiver', 'autre'];
    orderedKeys.forEach(key => {
        if (sessionCounts[key]) {
            html += `
                <div class="session-detail-item" onclick="filterBySession('${year}', '${key}')">
                    <span class="session-name">${sessionLabels[key]}</span>
                    <span class="session-count">${sessionCounts[key]}</span>
                </div>
            `;
        }
    });
    html += '</div>';
    contentEl.innerHTML = html;
    detailContainer.style.display = 'block';
}

function filterBySession(year, sessionKey) {
    window.location.href = buildObjectsUrl({ year: year, session: sessionKey });
}

function renderTopAuthors() {
    const authorCounts = {};
    const authorParties = {};
    
    filteredData.forEach(item => {
        const author = item.author;
        if (author && !author.includes('Commission') && !author.includes('Kommission') && !author.includes('Fraktion')) {
            authorCounts[author] = (authorCounts[author] || 0) + 1;
            if (item.party) authorParties[author] = normalizeParty(item.party);
        }
    });
    
    const topAuthors = Object.entries(authorCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const container = document.getElementById('topAuthors');
    
    if (topAuthors.length === 0) {
        container.innerHTML = `<p>${isDE ? 'Keine Daten verfügbar' : 'Aucune donnée disponible'}</p>`;
        return;
    }
    
    let html = '<div class="authors-ranking">';
    topAuthors.forEach(([author, count], index) => {
        const party = authorParties[author] || '';
        const medalClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : '';
        const objectsPage = isDE ? 'objects_de.html' : 'objects.html';
        const searchUrl = `${objectsPage}?search=${encodeURIComponent(author)}`;
        html += `
            <a href="${searchUrl}" class="author-row ${medalClass}">
                <div class="author-rank">${index + 1}</div>
                <div class="author-info">
                    <div class="author-name">${author}</div>
                    <div class="author-party">${party}</div>
                </div>
                <div class="author-count">${count}</div>
            </a>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

// ========== STATISTIQUES DÉBATS ==========

const debatePartyLabels = isDE ? {
    'V': 'SVP',
    'S': 'SP',
    'RL': 'FDP',
    'M-E': 'Die Mitte',
    'CE': 'Die Mitte',
    'C': 'Die Mitte',
    'BD': 'Die Mitte',
    'G': 'GRÜNE',
    'GL': 'GLP',
    '': 'Bundesrat'
} : {
    'V': 'UDC',
    'S': 'PS',
    'RL': 'PLR',
    'M-E': 'Le Centre',
    'CE': 'Le Centre',
    'C': 'Le Centre',
    'BD': 'Le Centre',
    'G': 'VERT-E-S',
    'GL': 'Vert\'libéraux',
    '': 'Conseil fédéral'
};

const councilLabels = isDE ? {
    'N': 'Nationalrat',
    'S': 'Ständerat',
    'V': 'Vereinigte Bundesversammlung'
} : {
    'N': 'Conseil national',
    'S': 'Conseil des États',
    'V': 'Assemblée fédérale'
};

const councilCodes = isDE ? {
    'Nationalrat': 'N',
    'Ständerat': 'S',
    'Vereinigte Bundesversammlung': 'V'
} : {
    'Conseil national': 'N',
    'Conseil des États': 'S',
    'Assemblée fédérale': 'V'
};

function renderDebatePartyChart() {
    if (debatePartyChartInstance) debatePartyChartInstance.destroy();
    
    const partyCounts = {};
    filteredDebatesData.forEach(item => {
        const party = debatePartyLabels[item.party] || item.party || (isDE ? 'Bundesrat' : 'Conseil fédéral');
        partyCounts[party] = (partyCounts[party] || 0) + 1;
    });
    
    const sortedParties = Object.entries(partyCounts).sort((a, b) => b[1] - a[1]);
    const labels = sortedParties.map(([party]) => party);
    const data = sortedParties.map(([, count]) => count);
    const colors = labels.map(party => {
        for (const [key, color] of Object.entries(partyColors)) {
            if (normalizeParty(key) === party) return color;
        }
        return '#999';
    });
    
    const ctx = document.getElementById('debatePartyChart').getContext('2d');
    debatePartyChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Interventions',
                data: data,
                backgroundColor: colors,
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const party = labels[index];
                    window.location.href = buildDebatesUrl({ party: party });
                }
            }
        }
    });
}

function renderDebateCouncilChart() {
    if (debateCouncilChartInstance) debateCouncilChartInstance.destroy();
    
    const councilCounts = {};
    filteredDebatesData.forEach(item => {
        const council = councilLabels[item.council] || item.council || 'Autre';
        councilCounts[council] = (councilCounts[council] || 0) + 1;
    });
    
    const labels = Object.keys(councilCounts);
    const data = Object.values(councilCounts);
    // Bleu cerulean = CN, Bleu foncé = CE, Violet = AF
    const colors = ['#2D6A8F', '#003399', '#8B5CF6'];
    
    const ctx = document.getElementById('debateCouncilChart').getContext('2d');
    debateCouncilChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    onClick: (event, legendItem) => {
                        const index = legendItem.index;
                        const council = labels[index];
                        const councilCode = councilCodes[council] || council;
                        window.location.href = buildDebatesUrl({ council: councilCode });
                    }
                }
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const council = labels[index];
                    const councilCode = councilCodes[council] || council;
                    window.location.href = buildDebatesUrl({ council: councilCode });
                }
            }
        }
    });
}

function isFederalCouncil(functionSpeaker) {
    if (!functionSpeaker) return false;
    return functionSpeaker.startsWith('BR') || functionSpeaker.startsWith('VPBR') || functionSpeaker.startsWith('BPR');
}

function isFederalChancellery(functionSpeaker) {
    if (!functionSpeaker) return false;
    return functionSpeaker.startsWith('BK');
}

function renderTopSpeakers() {
    const speakerCounts = {};
    const speakerParties = {};
    const speakerNames = {};
    
    filteredDebatesData.forEach(item => {
        const speaker = item.speaker;
        if (speaker) {
            const isCF = isFederalCouncil(item.function_speaker);
            const isChancellery = isFederalChancellery(item.function_speaker);
            const key = (isCF || isChancellery) ? `${speaker}|GOV` : `${speaker}|PARL`;
            
            speakerCounts[key] = (speakerCounts[key] || 0) + 1;
            speakerNames[key] = speaker;
            
            if (isCF) {
                speakerParties[key] = isDE ? 'Bundesrat' : 'Conseil fédéral';
            } else if (isChancellery) {
                speakerParties[key] = isDE ? 'Bundeskanzlei' : 'Chancellerie fédérale';
            } else if (item.party) {
                speakerParties[key] = debatePartyLabels[item.party] || item.party;
            } else {
                speakerParties[key] = '';
            }
        }
    });
    
    const topSpeakers = Object.entries(speakerCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const container = document.getElementById('topSpeakers');
    
    if (topSpeakers.length === 0) {
        container.innerHTML = `<p>${isDE ? 'Keine Daten verfügbar' : 'Aucune donnée disponible'}</p>`;
        return;
    }
    
    let html = '<div class="authors-ranking">';
    topSpeakers.forEach(([key, count], index) => {
        const speaker = speakerNames[key];
        const party = speakerParties[key] || '';
        const medalClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : '';
        const debatesPage = isDE ? 'debates_de.html' : 'debates.html';
        const searchUrl = `${debatesPage}?search=${encodeURIComponent(speaker)}`;
        html += `
            <a href="${searchUrl}" class="author-row ${medalClass}">
                <div class="author-rank">${index + 1}</div>
                <div class="author-info">
                    <div class="author-name">${speaker}</div>
                    <div class="author-party">${party}</div>
                </div>
                <div class="author-count">${count}</div>
            </a>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

function renderTopSpeakersNoCF() {
    const speakerCounts = {};
    const speakerParties = {};
    
    filteredDebatesData.forEach(item => {
        const speaker = item.speaker;
        if (speaker && item.party && !isFederalCouncil(item.function_speaker) && !isFederalChancellery(item.function_speaker)) {
            speakerCounts[speaker] = (speakerCounts[speaker] || 0) + 1;
            speakerParties[speaker] = debatePartyLabels[item.party] || item.party;
        }
    });
    
    const topSpeakers = Object.entries(speakerCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const container = document.getElementById('topSpeakersNoCF');
    
    if (topSpeakers.length === 0) {
        container.innerHTML = `<p>${isDE ? 'Keine Daten verfügbar' : 'Aucune donnée disponible'}</p>`;
        return;
    }
    
    let html = '<div class="authors-ranking">';
    topSpeakers.forEach(([speaker, count], index) => {
        const party = speakerParties[speaker] || '';
        const medalClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : '';
        const debatesPage = isDE ? 'debates_de.html' : 'debates.html';
        const searchUrl = `${debatesPage}?search=${encodeURIComponent(speaker)}`;
        html += `
            <a href="${searchUrl}" class="author-row ${medalClass}">
                <div class="author-rank">${index + 1}</div>
                <div class="author-info">
                    <div class="author-name">${speaker}</div>
                    <div class="author-party">${party}</div>
                </div>
                <div class="author-count">${count}</div>
            </a>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', init);

document.addEventListener('click', () => {
    document.querySelectorAll('.filter-dropdown.open').forEach(d => d.classList.remove('open'));
});
