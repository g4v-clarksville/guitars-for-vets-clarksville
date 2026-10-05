/* ==========================================================
   1. SONG SEARCH & CATALOG ENGINE
   ========================================================== */
let songDatabase = [];

// Fetch your full catalog from songs.json on load if the search input exists
fetch('songs.json')
    .then(response => response.json())
    .then(data => {
        songDatabase = data;
    })
    .catch(error => console.error('Error loading song catalog:', error));

const searchInput = document.getElementById('liveSongSearch');
const songGrid = document.getElementById('songGrid');

if (searchInput && songGrid) {
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        
        if (query === "") {
            return;
        }

        const filtered = songDatabase.filter(s => 
            s.title.toLowerCase().includes(query) || s.artist.toLowerCase().includes(query)
        );

        // Render filtered results logic here...
    });
}


/* ==========================================================
   2. SESSIONS & DASHBOARD ENGINE
   ========================================================== */
const mainContainer = document.getElementById('dashboard-root');
let allCycleData = [];

/* -----------------------------
   WAITLIST & UI TOGGLES
----------------------------- */
function toggleWaitlist() {
    const content = document.getElementById('waitlist-content');
    const arrow = document.getElementById('waitlist-arrow');

    if (!content || !arrow) return;

    const isHidden = getComputedStyle(content).display === "none";

    if (isHidden) {
        content.style.display = "block";
        arrow.innerText = "▲ CLOSE LIST";
    } else {
        content.style.display = "none";
        arrow.innerText = "▼ VIEW LIST";
    }
}

function toggleArchive(galleryId, btnElement, galleryName) {
    const gallery = document.getElementById(galleryId);
    
    if (!gallery) return;
    
    if (gallery.style.display === "none") {
        gallery.style.display = "block";
        btnElement.innerText = "▲ Close " + galleryName;
    } else {
        gallery.style.display = "none";
        btnElement.innerText = "▼ View " + galleryName;
    }
}

function switchGradTab(evt, tabId) {
    var contents = document.getElementsByClassName('grad-tab-content');
    for (var i = 0; i < contents.length; i++) {
        contents[i].style.display = 'none';
    }
    var buttons = document.getElementsByClassName('grad-tab-btn');
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].style.background = 'rgba(26, 31, 44, 0.9)';
        buttons[i].style.color = '#FFD700';
    }
    document.getElementById(tabId).style.display = 'block';
    evt.currentTarget.style.background = '#FFD700';
    evt.currentTarget.style.color = '#12161f';
}

/* -----------------------------
   CYCLE PROGRESS
----------------------------- */
function calculateProgress(cycle) {
    const vets = Array.isArray(cycle.vets) ? cycle.vets : [];
        
    if (vets.length === 0) return 0;
        
    const participatingVets = vets.filter(v => {
        const status = (v.status || "").toLowerCase().trim();
        return status !== "dropped" && status !== "deferred";
    });
        
    if (participatingVets.length === 0) return 0;
        
    const completedSessions = participatingVets.reduce((sum, vet) => {
        const session = Math.min(Number(vet.session) || 0, 10);
        return sum + session;
    }, 0);
        
    const totalPossible = participatingVets.length * 10;
        
    if (totalPossible === 0) return 0;
        
    return Math.min(
        100,
        Math.round((completedSessions / totalPossible) * 100)
    );
}
    
function getCycleStatus(cycle) {
    const vets = Array.isArray(cycle.vets) ? cycle.vets : [];
        
    const participating = vets.filter(v =>
        ["active", "graduated"].includes(
            (v.status || "").toLowerCase().trim()
        )
    );

    const allGraduated = participating.length > 0 &&
        participating.every(v =>
            (v.status || "").toLowerCase().trim() === "graduated"
        );

    const hasProgress = participating.some(v =>
        Number(v.session || 0) > 0
    );

    if (participating.length === 0) return "Waiting";
    if (allGraduated) return "Completed";
    if (hasProgress) return "Active";

    return "Waiting";
}

/* -----------------------------
   DASHBOARD BUILD
----------------------------- */
function buildDashboard(cycleData) {
    const reached = new Set();
    const alumni = new Set();
    const active = new Set();
    const waiting = new Set();
    const deferred = new Set();

    let totalDwellDays = 0;
    let dwellCount = 0;

    if (!mainContainer) return;
    mainContainer.innerHTML = '';

    // GLOBAL KPI LOOP
    allCycleData.forEach(cycle => {
        (cycle.vets || []).forEach(vet => {
            const vetKey = (vet.name || "").trim().toLowerCase();
            const statusText = (vet.status || "").toLowerCase().trim();
            const availabilityText = (vet.availability || "").toLowerCase().trim();

            if (statusText !== "dropped" && statusText !== "waiting" && statusText !== "deferred") reached.add(vetKey);

            if (statusText === "graduated" && availabilityText === "completed") {
                alumni.add(vetKey);
            }

            if (statusText === "active" && availabilityText === "in lessons") {
                active.add(vetKey);
            }

            if (statusText === "waiting") {
                waiting.add(vetKey);
            }
            
            if (statusText === "deferred") {
                deferred.add(vetKey);
            }
        });
    });

    // YEAR-SPECIFIC DWELL ONLY
    cycleData.forEach(cycle => {
        (cycle.vets || []).forEach(vet => {
            const contactDate = vet.contactDate ? new Date(vet.contactDate) : null;
            const startDate = cycle.startDate ? new Date(cycle.startDate) : null;

            if (
                contactDate &&
                startDate &&
                !isNaN(contactDate.getTime()) &&
                !isNaN(startDate.getTime())
            ) {
                const diffDays = (startDate - contactDate) / (1000 * 60 * 60 * 24);

                if (diffDays >= 0) {
                    totalDwellDays += diffDays;
                    dwellCount++;
                }
            }
        });
    });
   
    // RENDER ONLY SELECTED YEAR (cycleData)
    cycleData.forEach(cycle => {
        const progressValue = calculateProgress(cycle);
        const cycleStatus = getCycleStatus(cycle);
        let rows = '';

        (cycle.vets || []).forEach(vet => {
            const sessionCount = parseInt(vet.session) || 0;
            const statusText = (vet.status || "").toLowerCase().trim();
            const availabilityText = vet.availability || "";
            const availability = availabilityText.toLowerCase().trim();

            let displayStatus = "Waiting";
            
            if (statusText === "graduated") {
                displayStatus = "Graduated";
            }
            else if (sessionCount >= 10 || availability === "completed") {
                displayStatus = "Waiting to Graduate";
            }
            else if (statusText === "active" || availability === "in lessons") {
                displayStatus = "Active";
            }
            else if (statusText === "deferred" || statusText === "waiting") {
                displayStatus = "Waiting";
            }
            else if (statusText === "dropped") {
                displayStatus = "Dropped";
            }

            rows += `
                <tr class="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                    <td class="py-3 px-4 text-slate-400 font-mono text-xs">${vet.seq || '-'}</td>
                    <td class="py-3 px-4 font-semibold text-white vet-name-cell">${vet.name || ''}</td>
                    <td class="py-3 px-4 text-slate-300 font-mono text-xs">${sessionCount} / 10</td>
                    <td class="py-3 px-4 text-amber-300 font-medium">${displayStatus}</td>
                    <td class="py-3 px-4 text-slate-400">${availabilityText}</td>
                </tr>
            `;
        });

        const section = document.createElement('section');
        
        const cycleKey = `card_collapsed_${cycle.cycleId}`;
        const savedState = localStorage.getItem(cycleKey);
        
        let shouldCollapse = false;
        if (savedState !== null) {
            shouldCollapse = (savedState === 'true');
        } else if (progressValue === 100) {
            shouldCollapse = true;
        }
        
        section.className = `cycle-card rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-xl overflow-hidden mb-6 ${shouldCollapse ? 'collapsed' : ''}`;

        section.innerHTML = `
            <div class="card-header p-6 cursor-pointer bg-slate-900/80 hover:bg-slate-800/50 transition-colors border-b border-slate-800/80" onclick="toggleAndSaveCard(this, '${cycle.cycleId}')">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 class="m-0 text-amber-400 font-['Space_Grotesk'] font-bold text-lg flex items-center gap-2">
                        <span class="card-toggle-arrow font-mono text-xs text-slate-400">▼</span>
                        Cycle ${cycle.cycleId} 
                        <span class="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-normal">${cycleStatus}</span>
                    </h2> 

                    <div class="cycle-timeline text-xs text-slate-400 font-mono">
                        <span class="timeline-label text-slate-500 mr-1">TIMELINE:</span>
                        <span class="timeline-dates text-slate-300">
                            ${cycle.startDate || "TBD"} — ${cycle.endDate || "TBD"}
                        </span>
                    </div>
                </div>

                <div class="mt-4 flex items-center gap-4">
                    <div class="progress-container flex-1 bg-slate-950 rounded-full overflow-hidden h-2 border border-slate-800">
                        <div class="progress-bar bg-amber-400 h-full transition-all duration-500" style="width:${progressValue}%"></div>
                    </div>
                    <span class="progress-text text-xs font-mono text-slate-400 whitespace-nowrap">${progressValue}% Cycle Progress</span>
                </div>
            </div>

            <div class="instructor-box px-6 py-3 bg-slate-950/40 border-b border-slate-800/60 text-xs text-slate-300 font-mono">
                <span class="text-slate-500 mr-1">ASSIGNED INSTRUCTORS:</span> ${(cycle.instructors || []).join(' & ')}
            </div>

            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse text-sm">
                    <thead>
                        <tr class="border-b border-slate-800 text-xs text-slate-400 font-mono uppercase bg-slate-950/20">
                            <th class="py-3 px-4">Seq#</th>
                            <th class="py-3 px-4">Veteran</th>
                            <th class="py-3 px-4">Session</th>
                            <th class="py-3 px-4">Status</th>
                            <th class="py-3 px-4">Availability</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;

        mainContainer.appendChild(section);
    });

    // GLOBAL KPI OUTPUT
    const totalVetsEl = document.getElementById('total-vets');
    const gradCountEl = document.getElementById('grad-count');
    const activeCountEl = document.getElementById('active-count');
    const avgDaysEl = document.getElementById('avg-days');

    if (totalVetsEl) totalVetsEl.innerText = reached.size;
    if (gradCountEl) gradCountEl.innerText = alumni.size;
    if (activeCountEl) activeCountEl.innerText = active.size;

    const avgDwell = dwellCount > 0 ? Math.round(totalDwellDays / dwellCount) : null;
    if (avgDaysEl) avgDaysEl.innerText = avgDwell !== null ? avgDwell : "--";
}

/* -----------------------------
   CARD TOGGLE STATE STORAGE
----------------------------- */
function toggleAndSaveCard(headerElement, cycleId) {
    const cardSection = headerElement.parentElement;
    const isNowCollapsed = cardSection.classList.toggle('collapsed');
    localStorage.setItem(`card_collapsed_${cycleId}`, isNowCollapsed);
}
                    
/* -----------------------------
   DATA LOADING
----------------------------- */
function loadDataFromGoogle() {
    const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRZrgM6dmSRKecR8YR63T4Hvhq9vShmdLKvyqkx-HbO7DbXVNpBdhBl5SfOJFzvtFWBBwYnVYpNo_5z/pub?output=csv";

    Papa.parse(csvUrl, {
        download: true,
        header: true,
        complete: (r) => processExcelData(r.data)
    });
}

/* -----------------------------
   PROCESS DATA
----------------------------- */
function processExcelData(rawRows) {
    const groupedData = {};
    const waitlist = [];

    rawRows.forEach(row => {
        const id = row.cycleId ? row.cycleId.trim() : "";
        const status = row.status ? row.status.trim() : "";

        if ((status === "Waiting" || status === "Deferred") && row.vetName) {
            waitlist.push({
                name: row.vetName,
                availability: row.availability || "Waiting",
                notes: status,
                session: row.currentSession || 0
            });
        }

        if (!id) return; 

        if (!groupedData[id]) {
            groupedData[id] = {
                cycleId: id,
                startDate: row.startDate,
                endDate: row.endDate,
                instructorSet: new Set(),
                vets: []
            };
        }

        if (row.instructors) {
            row.instructors.split(',')
                .forEach(n => groupedData[id].instructorSet.add(n.trim()));
        }

        groupedData[id].vets.push({
            seq: row.vetSeq,
            name: row.vetName,
            status: row.status,
            availability: row.availability,
            session: row.currentSession || row.session || 0,
            contactDate: row.contactDate
        });
    });

    renderWaitlist(waitlist);

    allCycleData = Object.values(groupedData).map(c => {
        c.instructors = Array.from(c.instructorSet);
        return c;
    });

    filterByYear("2026");
}

/* -----------------------------
   WAITLIST RENDER
----------------------------- */
function renderWaitlist(waitlist) {
    const waitSection = document.getElementById('waitlist-section');
    const waitBody = document.getElementById('waitlist-body');
    const waitStat = document.getElementById('waitlist-stat');

    if (waitStat) waitStat.innerText = waitlist.length;

    if (!waitBody || !waitSection) return;

    waitBody.innerHTML = "";

    if (!waitlist || waitlist.length === 0) {
        waitSection.style.display = "none";
        return;
    }

    waitSection.style.display = "block";

    waitlist.forEach(vet => {
        waitBody.innerHTML += `
            <tr>
                <td>-</td>
                <td class="vet-name-cell" style="font-weight:bold;">${vet.name}</td>
                <td>${vet.session} / 10</td>
                <td>${vet.notes}</td>
                <td class="status-invited">${vet.availability}</td>
            </tr>
        `;
    });
}

/* -----------------------------
   YEAR FILTER & ACTIVE STATE
----------------------------- */
function filterByYear(year) {
    const filtered = allCycleData.filter(cycle => {
        if (!cycle.startDate) return false;
        return new Date(cycle.startDate).getFullYear().toString() === year;
    });

    buildDashboard(filtered);
}

function initializeYearSelector() {
    const buttons = document.querySelectorAll('.btn-year');
    
    buttons.forEach(button => {
        const yearText = button.textContent.trim();
        
        if (yearText === "2026") {
            button.classList.add("active");
        }

        button.addEventListener("click", () => {
            buttons.forEach(b => b.classList.remove("active"));
            button.classList.add("active");

            filterByYear(yearText);
        });
    });
}

/* -----------------------------
   INIT
----------------------------- */
initializeYearSelector();
if (mainContainer) {
    loadDataFromGoogle();
}
