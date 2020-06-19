//HEADER INFO ----
function showPageNumber() {
  document.querySelector("#page-number").innerHTML = `<p>Pages visited: <span class="value">${currentPageNumber}</span></p>`;
}

function showTotalOfLinks(total) {
  document.querySelector("#total-links").innerHTML = `<p>Total of Links: <span class="value">${total}</span></p>`;
}

function showDates() {
  function formatDate(date) {
    return date && `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`
  }
  document.querySelector("#date-interval").innerHTML =
    `<p>From: <span class="value">${formatDate(dates[dates.length - 1])}</span> To: <span class="value">${formatDate(dates[0])}</span></p>`
}

function showImages() {
  const imgs = images.map(img => `<img src="${img}"/>`).join('');
  document.querySelector("#gallery").innerHTML = imgs
}
// -----

let dates = [], links = [], images = [];
const maxPageNumber = 8;
let currentPageNumber = 0;

//Main Method -----------
function getStatistics(isOnline, callback) {
  dates = []; links = []; images = [];
  currentPageNumber = 0;
  document.querySelector("#error").innerHTML = '';

  if (isOnline) {
    getStatistic(0, e => {
      if (e && e.error) {
        document.querySelector("#error").innerHTML = `<p>${e.error}</p>`;
      } else {
        show();
      }
      callback();
    });
  } else {
    //OFFLINE ---  
    currentPageNumber = maxPageNumber
    dates = testDates.map(d => new Date(d));
    links = testLinks;

    show();
    if (callback)
      callback();
  }
}
// -----

//Shows the final result on the page
function show() {
  showPageNumber();
  showDates();

  new Promise((resolve, reject) => {
    showImages();
    resolve();
  }).then();

  links = links.sort((a, b) => b.count - a.count);
  const total = links.reduce((previous, current) => previous.count || previous + current.count);
  showTotalOfLinks(total);
  links = links.filter(k => k.count > 1);
  document.querySelector("#link-list").innerHTML = links.map(k => {
    const percentage = Math.trunc(k.count * 100 / total);
    return `<span class="hostname"><a href="https://${k.name}" target="_blank">${k.name}</a> - ${k.count}${percentage ? ` <span class="percentage">(${percentage}%)</span>` : ''}</span>`
  }).join('')

  links = links.slice(0, 10).filter(k => k.count > 1);

  new Chartist.Bar('.ct-chart', {
    labels: links.map(k => k.name),
    series: [
      links.map(k => k.count)
    ]
  }, {
    reverseData: true,
    horizontalBars: true,
    axisY: {
      offset: 170,
      stretch: true
    },
    axisX: {
      onlyInteger: true,
      scaleMinSpace: 20
    },
    width: '1000px',
    height: '600px'
  });
}

//Registers all dates from the original page
function registerAllDates(doc) {
  const classNames = doc.getElementsByClassName("entry-date published");
  for (let i = 0; i < classNames.length; ++i) {
    dates.push(new Date(classNames[i].getAttribute("datetime")));
  }
}

function normalizeHostname(hostname) {
  return hostname.replace("www.", "")
}

function isWhiteListItem(hostname) {
  return ["youtu.be", "usina.com", "radinhodepilha.com", "twitter.com", "wordpress.org", "colorlib.com",
    "soundcloud.com", "podcasts.apple.com", "google.com", "subscribeonandroid.com", "subscribebyemail.com", "ko-fi.com",
    "getpocket.com", "media.blubrry.com", "127.0.0.1:5500", "instagram.com", "pca.st", "radinhorefcollection.netlify.app"
  ].indexOf(hostname) === -1
}

//Registers all links from the original page
function registerAllLinks(doc) {
  for (let i = 0; i < doc.links.length; ++i) {
    const addr = new URL(doc.links[i]);
    const hostname = normalizeHostname(addr.host);
    if (isWhiteListItem(hostname)) {
      let index = -1;
      const host = links.find((e, i) => { index = i; return e.name === hostname; });
      if (host) {
        links[index] = { name: hostname, count: host.count + 1 };
      } else {
        links.push({ name: hostname, count: 1 });
      }
    }
  }
}

function registerAllImages(doc) {
  const elements = doc.getElementsByTagName("img");
  for (let i = 0; i < elements.length; ++i) {
    const src = elements[i].getAttribute("src")
    if (!images.find(img => img === src) && ["https://radinhodepilha.com/wp-content/uploads/2016/02/radinho_logo_type.png"].indexOf(src) === -1)
      images.push(src);
  }
}

//Request pages
const myFetchApi = () => {
  function send(url, load, error) {
    if (!url) throw "url string is required";
    if (!load) throw "load callback is required";
    if (!error) throw "error callback is required";

    fetch(url).
      then(res => res.text()).
      then(text => {
        if (text.indexOf("TypeError") > -1) { error(text); return }
        const doc = new DOMParser().parseFromString(text, 'text/html');
        load(doc);
      }).
      catch(e => error(e));
  }
  return { send }
}

//Recursive method that calls several original pages
function getStatistic(page, callback) {
  const url = `https://radinhodepilha.com${page > 1 ? `/page/${page}` : ''}`;

  myFetchApi().send(`https://cors-anywhere.herokuapp.com/${url}`, doc => {
    currentPageNumber++;

    registerAllDates(doc);

    registerAllLinks(doc);

    registerAllImages(doc);

    if (currentPageNumber < maxPageNumber) {
      getStatistic(currentPageNumber + 1, callback);
    } else {
      callback();
    }
  }, e => { console.log("error " + e); callback({ error: e }); });
}

