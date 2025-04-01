//Slidern
const section = document.querySelector(".slide-section");

if (section) {
    const images = [
        "Images/Slider/OlsenBanden.jpg",
        "Images/Slider/OlsenBanden1.jpg",
        "Images/Slider/OlsenBanden2.jpg",
        "Images/Slider/OlsenBanden3.avif",
        "Images/Slider/OlsenBanden4.jpg",
        "Images/Slider/OlsenBanden5.jpg"
    ];
    let lastIndex = 0;

    function createSlide(imageUrl, isFirst = false) {
        const slide = document.createElement("div");
        slide.style.position = "absolute";
        slide.style.top = "0";
        slide.style.left = isFirst ? "0" : "100%";
        slide.style.width = "100%";
        slide.style.height = "100%";
        slide.style.backgroundImage = `url(${imageUrl})`;
        slide.style.backgroundSize = "cover";
        slide.style.backgroundPosition = "center";
        slide.style.transition = isFirst ? "none" : "left 1s ease-in-out";

        if (isFirst) slide.classList.add("active-slide");
        section.appendChild(slide);
        return slide;
    }

    createSlide(images[lastIndex], true);

    function changeBg() {
        let index;
        do {
            index = Math.floor(Math.random() * images.length);
        } while (index === lastIndex);

        lastIndex = index;
        const newSlide = createSlide(images[index]);
        const oldSlide = section.querySelector(".active-slide");

        if (oldSlide) oldSlide.style.left = "-100%";
        newSlide.classList.add("active-slide");

        setTimeout(() => { newSlide.style.left = "0"; }, 10);
        setTimeout(() => {
            if (oldSlide && section.contains(oldSlide)) {
              section.removeChild(oldSlide);
            }
          }, 1000);
          
    }

    setInterval(changeBg, 5000);
}






//alt andet basicly
document.addEventListener("DOMContentLoaded", async () => {
    const dateSelector = document.querySelector('.date-selector');
    const programGrid = document.getElementById('filmProgram');
    const kommendeGrid = document.getElementById('kommendeFilm');

    if (!dateSelector || !programGrid || !kommendeGrid) return;

    const aktuelleFilm = await hentJSON('json-filer/aktuelle.json');
    //const kommendeFilm = await hentJSON('json-filer/kommende.json'); //det er hvis ikke vi autogerener prem
    
    const rawKommendeFilm = await hentJSON('json-filer/kommende.json');
    let kommendeFilm = JSON.parse(localStorage.getItem("kommendeFilmMedPremiere"));
    
    if (!kommendeFilm) {
        kommendeFilm = tilføjOgGemPremiereDatoer(rawKommendeFilm);
    }
    
    

    const idag = new Date();
    const idagStr = idag.toISOString().split('T')[0];
    const faktiskeAktuelle = aktuelleFilm.filter(f => f.premiere <= idagStr);

    const gemtPlan = localStorage.getItem("visningsplan");
    let visningsplan = [];

    if (gemtPlan) {
        try {
            visningsplan = JSON.parse(gemtPlan);
            faktiskeAktuelle.forEach(film => {
                film.visninger = visningsplan.filter(v => parseInt(v.filmId) === film.id);
            });
        } catch (err) {
            console.warn("Fejl i visningsplan – bruger fallback");
            localStorage.removeItem("visningsplan");
            visningsplan = genererOgGemVisninger(faktiskeAktuelle);
        }
    } else {
        visningsplan = genererOgGemVisninger(faktiskeAktuelle);
    }

    window.aktuelleFilm = faktiskeAktuelle;
    window.kommendeFilm = kommendeFilm;

    const dage = genererDage(7);
    dage.forEach((dato, i) => {
        const btn = document.createElement('button');
        btn.textContent = i === 0
            ? "I dag"
            : i === 1
                ? "I morgen"
                : dato.toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'short' });

        btn.addEventListener('click', () => visFilmForDato(dato, faktiskeAktuelle));
        dateSelector.appendChild(btn);
    });

    visFilmForDato(idag, faktiskeAktuelle);
    kommendeGrid.innerHTML = lavFilmGrid(kommendeFilm, null, false);

    visNyesteFilm(kommendeFilm);


    //tilføj random primierere til kommende film
    function tilføjOgGemPremiereDatoer(kommendeFilm, maxDage = 30) {
        const idag = new Date();
        const kommendeFilmMedDato = kommendeFilm.map(film => {
            const tilfældigeDage = Math.floor(Math.random() * maxDage) + 1;
            const premiere = new Date(idag);
            premiere.setDate(idag.getDate() + tilfældigeDage);
            const premiereStr = premiere.toISOString().split("T")[0];
            return { ...film, premiere: premiereStr };
        });
    
        localStorage.setItem("kommendeFilmMedPremiere", JSON.stringify(kommendeFilmMedDato));
        return kommendeFilmMedDato;
    }
    
});

//viser de nyeste premiere film 
function visNyesteFilm(kommendeFilm, antal = 3) {
    const featureKasser = document.querySelectorAll(".feature-kasse");

    let nyhederBoks = null;
    featureKasser.forEach(kasse => {
        const h3 = kasse.querySelector("h3");
        if (h3 && h3.textContent.trim().toLowerCase() === "nyheder") {
            nyhederBoks = kasse;
        }
    });

    if (!nyhederBoks) return;

    const idag = new Date();
    const sorteret = [...kommendeFilm]
        .filter(f => new Date(f.premiere) > idag)
        .sort((a, b) => new Date(a.premiere) - new Date(b.premiere))
        .slice(0, antal);

    const nyhedsWrapper = document.createElement("div");
    nyhedsWrapper.className = "nyhedsfilm-wrapper";

    sorteret.forEach(film => {
        const div = document.createElement("div");
        div.className = "nyhedsfilm-item";
        div.innerHTML = `
            <a href="FilmSiden/film.html?id=${film.id}" target="_blank">
                <img src="${film.billede_url}" alt="${film.titel}">
                <div class="nyhedsfilm-overlay">
                    <h4>${film.titel}</h4>
                    <p>Premiere: ${film.premiere}</p>
                </div>
            </a>
        `;
        nyhedsWrapper.appendChild(div);
    });

    nyhederBoks.appendChild(nyhedsWrapper);
}




//Visninger
function genererOgGemVisninger(filmListe, antalDage = 7, tider = ["17:30", "19:00", "21:30"], saler = [1, 2, 3]) {
    const nu = new Date();
    const slots = [];

    for (let dag = 0; dag < antalDage; dag++) {
        const dato = new Date(nu);
        dato.setDate(dato.getDate() + dag);
        const datoStr = dato.toISOString().split("T")[0];

        for (const tid of tider) {
            for (const sal of saler) {
                slots.push({ dato: datoStr, tid, sal });
            }
        }
    }

    // Shuffle slots
    for (let i = slots.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [slots[i], slots[j]] = [slots[j], slots[i]];
    }

    // Nulstil
    filmListe.forEach(f => f.visninger = []);
    let slotIndex = 0;

    while (slotIndex < slots.length) {
        for (const film of filmListe) {
            if (slotIndex >= slots.length) break;

            const slot = slots[slotIndex++];
            film.visninger.push({
                filmId: film.id,
                dato: slot.dato,
                tid: slot.tid,
                sal: slot.sal
            });
        }
    }

    const samletPlan = filmListe.flatMap(film =>
        film.visninger.map(v => ({
            filmId: film.id,
            dato: v.dato,
            tid: v.tid,
            sal: v.sal
        }))
    );

    localStorage.setItem("visningsplan", JSON.stringify(samletPlan));
    return samletPlan;
}



function hentJSON(filnavn) {
    return fetch(filnavn)
        .then(res => {
            if (!res.ok) throw new Error(`Kunne ikke hente ${filnavn}`);
            return res.json();
        })
        .catch(err => {
            console.error(err);
            return [];
        });
}




function genererDage(antal) {
    const liste = [];
    const nu = new Date();
    for (let i = 0; i < antal; i++) {
        const dato = new Date(nu);
        dato.setDate(nu.getDate() + i);
        liste.push(dato);
    }
    return liste;
}




function visFilmForDato(dato, filmListe) {
    const valgtDatoStr = dato.toISOString().split('T')[0];
    const programGrid = document.getElementById('filmProgram');

    const filmIDag = filmListe.filter(film =>
        Array.isArray(film.visninger) &&
        film.visninger.some(visning => visning.dato === valgtDatoStr)
    );

    programGrid.innerHTML = lavFilmGrid(filmIDag, valgtDatoStr, false);
}





function lavFilmGrid(filmArray, valgtDato, visAlle = false) {
    if (!Array.isArray(filmArray) || filmArray.length === 0) {
        return "<p>Ingen film fundet.</p>";
    }

    const filmDerVises = visAlle ? filmArray : filmArray.slice(0, 7);

    const html = filmDerVises.map(film => {
        const visninger = Array.isArray(film.visninger)
            ? film.visninger.filter(v => v.dato === valgtDato)
            : [];

        const visningHTML = visninger.length > 0
            ? `<div class="visningstider">
                <ul>
                    ${visninger.map(v =>
                        `<li>${v.dato} – kl. ${v.tid} (Sal ${v.sal})</li>`
                    ).join("")}
                </ul>
              </div>`
            : "<p class='ingen-visning'>Ingen visninger</p>";

        return `
            <div class="film-kort hover-effekt">
                <img src="${film.billede_url}" alt="${film.titel}" />
                <div class="film-info">
                    <h3>${film.titel}</h3>
                    ${visningHTML}
                </div>
                <a href="FilmSiden/film.html?id=${film.id}" class="se-mere-knap" target="_blank">Se mere</a>
            </div>
        `;
    }).join('');

    if (!visAlle && filmArray.length > 7) {
        return html + `
            <div class="vis-mere-wrapper">
                <button class="vis-mere-knap" onclick="visMere('${valgtDato || "kommende"}')"> l l l </button>
            </div>
        `;
    }

    return html;
}




function visMere(datoStr) {
    const programGrid = document.getElementById('filmProgram');
    const kommendeGrid = document.getElementById('kommendeFilm');

    if (datoStr === "kommende") {
        kommendeGrid.innerHTML = lavFilmGrid(window.kommendeFilm, null, true);
    } else {
        const filmIDag = window.aktuelleFilm.filter(film =>
            Array.isArray(film.visninger) &&
            film.visninger.some(visning => visning.dato === datoStr)
        );
        programGrid.innerHTML = lavFilmGrid(filmIDag, datoStr, true);
    }
}




function åbenFilm(filmId) {
    const width = 900;
    const height = 800;
    const left = (screen.width / 2) - (width / 2);
    const top = (screen.height / 2) - (height / 2);

    const win = window.open(
        `FilmSiden/film.html?id=${filmId}`,
        `_blank`,
        `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`
    );

    if (!win || win.closed || typeof win.closed === 'undefined') {
        window.location.href = `film.html?id=${filmId}`;
    }
}