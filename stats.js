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
    'PSS': '#E53935',
    'PS': '#E53935',
    'PLR': '#0066CC',
    'Le Centre': '#FF9800',
    'Centre': '#FF9800',
    'M-E': '#FF9800',
    'PDC': '#FF9800',
    'PBD': '#FF9800',
    'CSPO': '#FF9800',
    'CVP': '#FF9800',
    'BDP': '#FF9800',
    'VERT-E-S': '#8BC34A',
    'Les Vert-e-s': '#8BC34A',
    'Al': '#8BC34A',
    'Vert\'libéraux': '#CDDC39',
    'pvl': '#CDDC39',
    'PVL': '#CDDC39'
};

const partyLabels = {
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
    'PVL': 'Vert\'libéraux'
};

const typeLabels = {
    'Mo.': 'Motion',
    'Po.': 'Postulat',
    'Ip.': 'Interpellation',
    'Fra.': 'Heure des questions',
    'A.': 'Question',
    'Pa. Iv.': 'Initiative parl.',
    'D.Ip.': 'Interpellation urgente',
    'BRG': 'Objet du CF'
};

function translateDept(deptDE) {
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

const typeToFilter = {
    'Motion': 'Mo.',
    'Postulat': 'Po.',
    'Interpellation': 'Ip.',
    'Heure des questions': 'Fra.',
    'Question': 'A.',
    'Initiative parl.': 'Pa. Iv.',
    'Interpellation urgente': 'D.Ip.',
    'Objet du CF': 'BRG'
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
        const allTags = new Set();
        allData.forEach(item => {
            if (item.tags) {
                item.tags.split('|').forEach(tag => {
                    if (tag.trim()) allTags.add(tag.trim());
                });
            }
        });
        const tagsArray = [...allTags].sort((a, b) => a.localeCompare(b, 'fr'));
        tagsArray.forEach(tag => {
            const label = document.createElement('label');
            label.innerHTML = `<input type="checkbox" value="${tag}"> ${tag}`;
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
            const itemTags = item.tags ? item.tags.split('|').map(t => t.trim()) : [];
            const hasMatchingTag = itemTags.some(tag => tagsFilters.includes(tag));
            if (!hasMatchingTag) return false;
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
    return `objects.html${queryString ? '?' + queryString : ''}`;
}

function renderAllObjectCharts() {
    renderPartyChart();
    renderTypeChart();
    renderYearChart();
    renderTopAuthors();
    updateGlobalSummary();
}

const sessionTypes = {
    '5001': 'Hiver', '5002': 'Printemps', '5003': 'Spéciale', '5004': 'Été', '5005': 'Automne',
    '5006': 'Hiver', '5007': 'Printemps', '5008': 'Spéciale', '5009': 'Été', '5010': 'Automne',
    '5011': 'Hiver', '5012': 'Printemps', '5013': 'Été', '5014': 'Automne',
    '5015': 'Hiver', '5016': 'Printemps', '5017': 'Spéciale', '5018': 'Été', '5019': 'Automne',
    '5101': 'Hiver', '5102': 'Printemps', '5103': 'Spéciale', '5104': 'Été', '5105': 'Automne',
    '5106': 'Spéciale', '5107': 'Hiver', '5108': 'Printemps', '5109': 'Spéciale', '5110': 'Été',
    '5111': 'Automne', '5112': 'Hiver', '5113': 'Printemps', '5114': 'Spéciale', '5115': 'Été',
    '5116': 'Automne', '5117': 'Hiver', '5118': 'Printemps', '5119': 'Spéciale', '5120': 'Spéciale',
    '5121': 'Été', '5122': 'Automne',
    '5201': 'Hiver', '5202': 'Printemps', '5203': 'Spéciale', '5204': 'Été', '5205': 'Automne',
    '5206': 'Hiver', '5207': 'Printemps', '5208': 'Spéciale', '5209': 'Été', '5210': 'Automne',
    '5211': 'Hiver', '5212': 'Printemps', '5213': 'Spéciale', '5214': 'Été', '5215': 'Automne',
    '5216': 'Hiver', '5217': 'Printemps', '5218': 'Spéciale'
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
    const parties = [...new Set(debatesData.map(d => {
        if (!d.party) return 'Conseil fédéral';
        return debatePartyLabels[d.party] || d.party;
    }))];
    parties.sort((a, b) => a.localeCompare(b, 'fr'));
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
        const allTags = new Set();
        debatesData.forEach(item => {
            const tags = debateTagsMapping[item.business_number];
            if (tags) {
                tags.split('|').forEach(tag => {
                    if (tag.trim()) allTags.add(tag.trim());
                });
            }
        });
        const tagsArray = [...allTags].sort((a, b) => a.localeCompare(b, 'fr'));
        tagsArray.forEach(tag => {
            const label = document.createElement('label');
            label.innerHTML = `<input type="checkbox" value="${tag}"> ${tag}`;
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
            const itemParty = item.party ? (debatePartyLabels[item.party] || item.party) : 'Conseil fédéral';
            if (!partyFilters.includes(itemParty)) return false;
        }
        if (deptFilters.length > 0) {
            const itemDept = item.department || 'none';
            if (!deptFilters.includes(itemDept)) return false;
        }
        if (tagsFilters.length > 0) {
            const itemTags = debateTagsMapping[item.business_number];
            if (!itemTags) return false;
            const itemTagsArray = itemTags.split('|').map(t => t.trim());
            const hasMatchingTag = tagsFilters.some(tag => itemTagsArray.includes(tag));
            if (!hasMatchingTag) return false;
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
    return `debates.html${queryString ? '?' + queryString : ''}`;
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
    
    titleEl.textContent = `Détail ${year} par session`;
    
    const sessionLabels = {
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
        container.innerHTML = '<p>Aucune donnée disponible</p>';
        return;
    }
    
    let html = '<div class="authors-ranking">';
    topAuthors.forEach(([author, count], index) => {
        const party = authorParties[author] || '';
        const medalClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : '';
        const searchUrl = `objects.html?search=${encodeURIComponent(author)}`;
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

const debatePartyLabels = {
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

const councilLabels = {
    'N': 'Conseil national',
    'S': 'Conseil des États',
    'V': 'Assemblée fédérale'
};

const councilCodes = {
    'Conseil national': 'N',
    'Conseil des États': 'S',
    'Assemblée fédérale': 'V'
};

function renderDebatePartyChart() {
    if (debatePartyChartInstance) debatePartyChartInstance.destroy();
    
    const partyCounts = {};
    filteredDebatesData.forEach(item => {
        const party = debatePartyLabels[item.party] || item.party || 'Conseil fédéral';
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
                speakerParties[key] = 'Conseil fédéral';
            } else if (isChancellery) {
                speakerParties[key] = 'Chancellerie fédérale';
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
        container.innerHTML = '<p>Aucune donnée disponible</p>';
        return;
    }
    
    let html = '<div class="authors-ranking">';
    topSpeakers.forEach(([key, count], index) => {
        const speaker = speakerNames[key];
        const party = speakerParties[key] || '';
        const medalClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : '';
        const searchUrl = `debates.html?search=${encodeURIComponent(speaker)}`;
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
        container.innerHTML = '<p>Aucune donnée disponible</p>';
        return;
    }
    
    let html = '<div class="authors-ranking">';
    topSpeakers.forEach(([speaker, count], index) => {
        const party = speakerParties[speaker] || '';
        const medalClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : '';
        const searchUrl = `debates.html?search=${encodeURIComponent(speaker)}`;
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
