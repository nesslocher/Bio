document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const filmId = parseInt(params.get("id"));

    const [aktuelle, kommende] = await Promise.all([
        hentJSON("../json-filer/aktuelle.json"),
        hentJSON("../json-filer/kommende.json")
    ]);

    const idagStr = new Date().toISOString().split("T")[0];
    const faktiskeAktuelle = aktuelle.filter(f => f.premiere <= idagStr);

    let film = [...faktiskeAktuelle, ...kommende].find(f => f.id === filmId);


    let visningsplan = [];
    const gemtPlan = localStorage.getItem("visningsplan");
    if (gemtPlan) {
        visningsplan = JSON.parse(gemtPlan);
    }


    if (film) {
        const filmVisninger = visningsplan.filter(v => parseInt(v.filmId) === film.id);
        if (filmVisninger.length > 0) {
            film.visninger = filmVisninger;
        } else {
            
            const alleAktuelleFilm = faktiskeAktuelle;
            visningsplan = genererOgGemVisninger(alleAktuelleFilm);
            film.visninger = visningsplan.filter(v => parseInt(v.filmId) === film.id);
        }
    }

    const container = document.getElementById("filmContainer");

    if (!film) {
        container.innerHTML = "<p>Film ikke fundet.</p>";
        return;
    }

    container.innerHTML = `
        <h1>${film.titel}</h1>
        <div class="film-indhold">
            <div class="venstre-side">
                <img src="../${film.billede_url}" alt="${film.titel}" class="film-billede">
                ${film.trailer ? `
                    <div class="trailer-wrapper">
                        <iframe src="${film.trailer}" frameborder="0" allowfullscreen></iframe>
                    </div>
                ` : `<p>Trailer ikke tilgængelig.</p>`}
            </div>

            <section class="højre-side">
                <div class="info-item full-width">
                    <div class="film-tekst">
                        <h3>Om filmen:</h3>
                        <p>${film.handlingsbeskrivelse}</p>
                    </div>
                </div>

                <div class="film-info-grid" id="filmInfoGrid">
                    <div class="info-wrapper">
                        <div class="info-item"> <strong>Anmeldelser:</strong> <span>${film.anmeldelser}</span> </div>
                        <div class="info-item"> <strong>Aldersgrænse:</strong> <span>${film.aldersgrænse}</span> </div>
                        <div class="info-item"> <strong>Filmlængde:</strong> <span>${film.længde}</span> </div>
                        <div class="info-item"> <strong>Original titel:</strong> <span>${film.Originaltitel}</span> </div>
                        <div class="info-item hidden"> <strong>Premiere:</strong> <span>${film.premiere}</span> </div>
                        <div class="info-item hidden"> <strong>Instruktør:</strong> <span>${film.instruktør}</span> </div>
                        <div class="info-item hidden">
                            <strong>Skuespillere:</strong>
                            <ul>${film.skuespillere.map(s => `<li>${s.trim()}</li>`).join("")}</ul>
                        </div>
                        <div class="info-item hidden">
                            <strong>Genre:</strong>
                            <ul>${film.genre.map(g => `<li>${g.trim()}</li>`).join("")}</ul>
                        </div>
                        <button id="toggleInfoBtn">Vis mere</button>
                    </div>
                </div>
            </section>
        </div>
    `;


    const toggleBtn = document.getElementById("toggleInfoBtn");
    toggleBtn.addEventListener("click", () => {
        const allItems = document.querySelectorAll("#filmInfoGrid .info-item");
        for (let i = 4; i < allItems.length; i++) {
            allItems[i].classList.toggle("hidden");
        }
        toggleBtn.textContent = toggleBtn.textContent === "Vis mere" ? "Vis mindre" : "Vis mere";
    });


    const select = document.getElementById("tidspunkt");
    if (film.visninger && film.visninger.length > 0) {
        select.innerHTML = film.visninger.map(v => `
            <option value="${v.dato} ${v.tid} Sal ${v.sal}">
                ${v.dato} - kl. ${v.tid} (Sal ${v.sal})
            </option>
        `).join('');
    } else {
        select.innerHTML = `<option disabled>Ingen visninger tilgængelige</option>`;
    }


    document.getElementById("bestilForm").addEventListener("submit", e => {
        e.preventDefault();
        const valgt = select.value;

        const sædeWrapper = document.getElementById("sædevalgWrapper");
        const sædeGrid = document.getElementById("sædeGrid");
        const bekræftBtn = document.getElementById("bekræftKøb");

        sædeGrid.innerHTML = "";
        sædeWrapper.classList.remove("hidden");

        const antalSæder = 80;
        const optagne = [];

        for (let i = 1; i <= antalSæder; i++) {
            const btn = document.createElement("div");
            btn.classList.add("sæde");
            btn.dataset.nr = i;

            if (optagne.includes(i)) {
                btn.classList.add("optaget");
            } else {
                btn.addEventListener("click", () => {
                    btn.classList.toggle("valgt");
                    const nogleValgt = sædeGrid.querySelector(".valgt");
                    bekræftBtn.classList.toggle("hidden", !nogleValgt);
                });
            }
            sædeGrid.appendChild(btn);
        }

        bekræftBtn.classList.add("hidden");
        bekræftBtn.onclick = () => {
            const valgte = [...sædeGrid.querySelectorAll(".valgt")].map(s => s.dataset.nr);
            alert(`Du har valgt sæde(r): ${valgte.join(", ")} til ${valgt}`);
        };
    });
});


function genererVisningerTilFilm(filmListe, antalDage = 7, tider = ["17:30", "19:00", "21:30"], saler = [1, 2, 3]) {
    const nu = new Date();
    const visningerPerDag = saler.length * tider.length;

    let filmIndex = 0;
    filmListe.forEach(f => f.visninger = []);

    for (let dag = 0; dag < antalDage; dag++) {
        const dato = new Date(nu);
        dato.setDate(nu.getDate() + dag);
        const datoStr = dato.toISOString().split('T')[0];

        const brugteSlots = new Set();

        for (let i = 0; i < visningerPerDag && filmIndex < filmListe.length; i++) {
            const tid = tider[i % tider.length];
            const sal = saler[Math.floor(i / tider.length)];

            const slotKey = `${datoStr}_${tid}_${sal}`;
            if (brugteSlots.has(slotKey)) continue;

            const film = filmListe[filmIndex % filmListe.length];
            film.visninger.push({
                dato: datoStr,
                tid: tid,
                sal: sal
            });

            brugteSlots.add(slotKey);
            filmIndex++;
        }
    }

    return filmListe;
}

async function hentJSON(filnavn) {
    try {
        const res = await fetch(filnavn);
        if (!res.ok) throw new Error(`Fejl ved hentning af ${filnavn}`);
        return await res.json();
    } catch (err) {
        console.error(err);
        return [];
    }
}
