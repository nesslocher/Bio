//konstanter
const loginForm = document.getElementById("loginForm");
const loginWrapper = document.getElementById("loginWrapper");
const adminPanel = document.getElementById("adminPanel");
const filmList = document.getElementById("filmList");
const gemBtn = document.getElementById("gemBtn");

const TIDER = ["17:30", "19:00", "21:30"];
const SALER = [1, 2, 3];
const ANTAL_DAGE = 14;

//lgoin delen
loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    if (username === "admin" && password === "kode123") {                  //hvis koden passe viser vi panel og fjerne login
        loginWrapper.classList.add("hidden");
        adminPanel.classList.remove("hidden");
        hentFilmData();
    } else {
        alert("Forkert login");
    }
});



//JSON
function hentFilmData() {
    fetch("../json-filer/aktuelle.json")
        .then(res => {
            if (!res.ok) throw new Error("Kunne ikke hente film");
            return res.json();
        })
        .then(filmData => {                 //hvis der allerede er gemte visninger i localStorage indlæses de, ellers en tom liste
            const gemtPlan = localStorage.getItem("visningsplan");
            const eksisterendeVisninger = gemtPlan ? JSON.parse(gemtPlan) : [];

            filmData.forEach((film, i) => {
                film.sal = SALER[i % SALER.length];
                film.visninger = eksisterendeVisninger.filter(v => parseInt(v.filmId) === film.id);

                if (film.visninger.length === 0) {
                    film.visninger = genererVisninger(film.id, film.sal);
                }

                visFilm(film);                                                      //viser filmen i UI
            });
        })
        .catch(err => {
            console.error("Fejl:", err);
            filmList.innerHTML = "<p>Kunne ikke hente filmdata.</p>";
        });
}

function genererVisninger(filmId, sal) {                                           //generer automariske visninger
    const startDato = new Date();
    const visninger = [];

    for (let i = 0; i < ANTAL_DAGE; i++) {
        const dato = new Date(startDato);
        dato.setDate(dato.getDate() + i);
        const datoStr = dato.toISOString().split("T")[0];

        TIDER.forEach(tid => {
            visninger.push({ filmId, dato: datoStr, tid, sal });
        });
    }

    return visninger;
}


function visFilm(film) {                                          //filmen hntes med fetch og vises i UI innerHTML
    const div = document.createElement("div");
    div.className = "film-admin";
    div.dataset.filmId = film.id;

    div.innerHTML = `
       <h3>${film.titel}</h3>
       <img src="../${film.billede_url}" alt="${film.titel}" class="film-thumb" />
       <label>Sal: <input type="number" class="sal-input" value="${film.sal}" /></label>
       <div class="visninger"></div>
       <button class="tilføj-visning">+ Tilføj visning</button>
    `;

    const visningerDiv = div.querySelector(".visninger");

    film.visninger.forEach(v => tilføjVisning(visningerDiv, v.dato, v.tid));                   //hvilke fields der vises

    div.querySelector(".tilføj-visning").addEventListener("click", () => {
        tilføjVisning(visningerDiv);
    });

    filmList.appendChild(div);
}

//Brugrgrænsefladen for at justere tiderne/visningerne
function tilføjVisning(container, dato = "", tid = "17:30") {
    const rad = document.createElement("div");
    rad.className = "visning";
    rad.innerHTML = `
        <input type="date" value="${dato}" />
        <select>
            ${TIDER.map(t => `<option ${t === tid ? "selected" : ""}>${t}</option>`).join("")}
        </select>
        <button class="fjern-visning">✖</button>
    `;
    rad.querySelector(".fjern-visning").addEventListener("click", () => {
        rad.remove();
    });
    container.appendChild(rad);
}


gemBtn.addEventListener("click", () => {                      //Gemmer alle visninger og gemmer i localStorage
    const alleVisninger = [];

    document.querySelectorAll(".film-admin").forEach(filmDiv => {
        const filmId = filmDiv.dataset.filmId;
        const sal = parseInt(filmDiv.querySelector(".sal-input").value);
        const visninger = filmDiv.querySelectorAll(".visning");

        visninger.forEach(v => {
            const dato = v.querySelector("input[type='date']").value;
            const tid = v.querySelector("select").value;
            if (dato && tid) {
                alleVisninger.push({ filmId, dato, tid, sal });
            }
        });
    });

    
    localStorage.setItem("visningsplan", JSON.stringify(alleVisninger));                   //Gemmer det hele i localStorage
    alert("Visninger gemt i browseren!");
});


