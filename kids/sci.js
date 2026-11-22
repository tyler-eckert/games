/* Kids: science and general. */
(function () {
  'use strict';
  var K = window.Kids, h = K.h;
  var S = [['AL', 'Alabama', 'Montgomery'], ['AK', 'Alaska', 'Juneau'], ['AZ', 'Arizona', 'Phoenix'], ['AR', 'Arkansas', 'Little Rock'], ['CA', 'California', 'Sacramento'], ['CO', 'Colorado', 'Denver'], ['CT', 'Connecticut', 'Hartford'], ['DE', 'Delaware', 'Dover'], ['FL', 'Florida', 'Tallahassee'], ['GA', 'Georgia', 'Atlanta'], ['HI', 'Hawaii', 'Honolulu'], ['ID', 'Idaho', 'Boise'], ['IL', 'Illinois', 'Springfield'], ['IN', 'Indiana', 'Indianapolis'], ['IA', 'Iowa', 'Des Moines'], ['KS', 'Kansas', 'Topeka'], ['KY', 'Kentucky', 'Frankfort'], ['LA', 'Louisiana', 'Baton Rouge'], ['ME', 'Maine', 'Augusta'], ['MD', 'Maryland', 'Annapolis'], ['MA', 'Massachusetts', 'Boston'], ['MI', 'Michigan', 'Lansing'], ['MN', 'Minnesota', 'Saint Paul'], ['MS', 'Mississippi', 'Jackson'], ['MO', 'Missouri', 'Jefferson City'], ['MT', 'Montana', 'Helena'], ['NE', 'Nebraska', 'Lincoln'], ['NV', 'Nevada', 'Carson City'], ['NH', 'New Hampshire', 'Concord'], ['NJ', 'New Jersey', 'Trenton'], ['NM', 'New Mexico', 'Santa Fe'], ['NY', 'New York', 'Albany'], ['NC', 'North Carolina', 'Raleigh'], ['ND', 'North Dakota', 'Bismarck'], ['OH', 'Ohio', 'Columbus'], ['OK', 'Oklahoma', 'Oklahoma City'], ['OR', 'Oregon', 'Salem'], ['PA', 'Pennsylvania', 'Harrisburg'], ['RI', 'Rhode Island', 'Providence'], ['SC', 'South Carolina', 'Columbia'], ['SD', 'South Dakota', 'Pierre'], ['TN', 'Tennessee', 'Nashville'], ['TX', 'Texas', 'Austin'], ['UT', 'Utah', 'Salt Lake City'], ['VT', 'Vermont', 'Montpelier'], ['VA', 'Virginia', 'Richmond'], ['WA', 'Washington', 'Olympia'], ['WV', 'West Virginia', 'Charleston'], ['WI', 'Wisconsin', 'Madison'], ['WY', 'Wyoming', 'Cheyenne']];
  var KNOWN = ['CA', 'TX', 'FL', 'NY', 'OK', 'AK', 'HI', 'WA', 'CO', 'AZ', 'NM', 'KS', 'AR', 'LA', 'IL'];
  function pool(lv) { var all = S.slice(); if (lv === 1) return all.filter(function (s) { return KNOWN.indexOf(s[0]) > -1; }); if (lv === 2) return K.shuffle(all).slice(0, 30); return all; }
  var LV = [{ label: 'EASY', sub: '15 well-known states', value: 1 }, { label: 'MEDIUM', sub: '30 states', value: 2 }, { label: 'HARD', sub: 'All 50 states', value: 3 }];

  K.reg({ id: 'states', subject: 'sci', title: 'FIND THE STATE', desc: 'Tap the state on the tile map', emoji: '🗺️', run: function (box, ctx) {
    K.levels(box, LV, function (lv) {
      var p = K.shuffle(pool(lv));
      K.quiz(box, ctx, { total: 10, delay: 700, make: function (i) {
        var s = p[i % p.length];
        return { build: function (stage, done) {
          stage.appendChild(h('div', 'kbig', s[1].toUpperCase()));
          stage.appendChild(h('div', 'ksub', 'Tap the state on the map.'));
          var NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg'), paths = {}, locked = false, zoomed = false;
          svg.setAttribute('viewBox', '0 0 975 610'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Map of the United States');
          svg.style.width = '100%'; svg.style.height = 'auto';
          Object.keys(window.US_MAP).forEach(function (code) {
            var p = document.createElementNS(NS, 'path');
            p.setAttribute('d', window.US_MAP[code].d); p.setAttribute('class', 'kst'); p.setAttribute('aria-label', code);
            p.addEventListener('click', function () {
              if (locked) return; locked = true;
              if (code === s[0]) { p.classList.add('right'); done(true, 'YES! THAT IS ' + s[1].toUpperCase() + '.'); }
              else { p.classList.add('wrong'); paths[s[0]].classList.add('right'); var w = S.filter(function (x) { return x[0] === code; })[0]; done(false, 'THAT IS ' + w[1].toUpperCase() + '. ' + s[1].toUpperCase() + ' IS THE GREEN ONE.'); }
            });
            svg.appendChild(p); paths[code] = p;
          });
          var map = h('div', 'kmapwrap'); map.appendChild(svg);
          stage.appendChild(K.btn('ZOOM NORTHEAST', '', function () { zoomed = !zoomed; svg.setAttribute('viewBox', zoomed ? '690 90 285 260' : '0 0 975 610'); this.textContent = zoomed ? 'SHOW WHOLE MAP' : 'ZOOM NORTHEAST'; }));
          stage.appendChild(map);
        } };
      } });
    });
  } });

  K.reg({ id: 'capitals', subject: 'sci', title: 'STATE CAPITALS', desc: 'Match each state to its capital', emoji: '🏛️', run: function (box, ctx) {
    K.levels(box, LV, function (lv) {
      var p = K.shuffle(pool(lv));
      K.quiz(box, ctx, { total: 10, delay: 800, make: function (i) {
        var s = p[i % p.length];
        return { build: function (stage, done) {
          stage.appendChild(h('div', 'ksub', 'What is the capital of'));
          stage.appendChild(h('div', 'kbig', s[1].toUpperCase() + '?'));
          var set = {}; set[s[2]] = 1;
          while (Object.keys(set).length < 4) set[K.pick(S)[2]] = 1;
          var labs = K.shuffle(Object.keys(set));
          K.choices(stage, labs, labs.indexOf(s[2]), done, 'THE CAPITAL OF ' + s[1].toUpperCase() + ' IS ' + s[2].toUpperCase() + '.');
        } };
      } });
    });
  } });

  var SETS = [
    { label: 'LIVING OR NOT', sub: 'Is it alive?', bins: ['LIVING', 'NOT LIVING'], items: [['🐶', 'dog', 0], ['🌳', 'tree', 0], ['🌻', 'flower', 0], ['🐟', 'fish', 0], ['🐛', 'bug', 0], ['🍄', 'mushroom', 0], ['🪨', 'rock', 1], ['🚗', 'car', 1], ['⚽', 'ball', 1], ['📖', 'book', 1], ['☁️', 'cloud', 1], ['🧸', 'teddy bear', 1]] },
    { label: 'ANIMAL GROUPS', sub: 'Mammal, bird or fish', bins: ['MAMMAL', 'BIRD', 'FISH'], items: [['🐶', 'dog', 0], ['🐘', 'elephant', 0], ['🐬', 'dolphin', 0], ['🦇', 'bat', 0], ['🦆', 'duck', 1], ['🦉', 'owl', 1], ['🐧', 'penguin', 1], ['🦅', 'eagle', 1], ['🐟', 'fish', 2], ['🦈', 'shark', 2], ['🐠', 'tropical fish', 2], ['🐡', 'puffer fish', 2]] },
    { label: 'FLOAT OR SINK', sub: 'Will it float?', bins: ['FLOAT', 'SINK'], items: [['🪵', 'wood log', 0], ['🍎', 'apple', 0], ['🏀', 'basketball', 0], ['🍃', 'leaf', 0], ['🦺', 'life jacket', 0], ['🔑', 'key', 1], ['🪙', 'coin', 1], ['🪨', 'rock', 1], ['🔩', 'bolt', 1], ['⚓', 'anchor', 1]] },
    { label: 'FOOD CHOICES', sub: 'Healthy or treat', bins: ['HEALTHY', 'TREAT'], items: [['🍎', 'apple', 0], ['🥦', 'broccoli', 0], ['🥕', 'carrot', 0], ['🍌', 'banana', 0], ['🥛', 'milk', 0], ['🍩', 'donut', 1], ['🍭', 'lollipop', 1], ['🍪', 'cookie', 1], ['🍰', 'cake', 1], ['🍟', 'fries', 1]] }
  ];
  K.reg({ id: 'sort', subject: 'sci', title: 'SORT IT', desc: 'Put each thing in the right group', emoji: '🧺', run: function (box, ctx) {
    K.levels(box, SETS.map(function (s, i) { return { label: s.label, sub: s.sub, value: i }; }), function (si) {
      var set = SETS[si], items = K.shuffle(set.items);
      K.quiz(box, ctx, { total: Math.min(10, items.length), delay: 700, make: function (i) {
        var it = items[i % items.length];
        return { build: function (stage, done) {
          stage.appendChild(h('div', 'kemoji', it[0]));
          stage.appendChild(h('div', 'kbig', it[1].toUpperCase()));
          stage.appendChild(h('div', 'ksub', 'Which group?'));
          K.choices(stage, set.bins, it[2], done, 'A ' + it[1].toUpperCase() + ' IS ' + set.bins[it[2]] + '.');
        } };
      } });
    });
  } });
})();
