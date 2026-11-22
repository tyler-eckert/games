/* Kids: science and general. */
(function () {
  'use strict';
  var K = window.Kids, h = K.h;
  var S = [['AL', 'Alabama', 'Montgomery'], ['AK', 'Alaska', 'Juneau'], ['AZ', 'Arizona', 'Phoenix'], ['AR', 'Arkansas', 'Little Rock'], ['CA', 'California', 'Sacramento'], ['CO', 'Colorado', 'Denver'], ['CT', 'Connecticut', 'Hartford'], ['DE', 'Delaware', 'Dover'], ['FL', 'Florida', 'Tallahassee'], ['GA', 'Georgia', 'Atlanta'], ['HI', 'Hawaii', 'Honolulu'], ['ID', 'Idaho', 'Boise'], ['IL', 'Illinois', 'Springfield'], ['IN', 'Indiana', 'Indianapolis'], ['IA', 'Iowa', 'Des Moines'], ['KS', 'Kansas', 'Topeka'], ['KY', 'Kentucky', 'Frankfort'], ['LA', 'Louisiana', 'Baton Rouge'], ['ME', 'Maine', 'Augusta'], ['MD', 'Maryland', 'Annapolis'], ['MA', 'Massachusetts', 'Boston'], ['MI', 'Michigan', 'Lansing'], ['MN', 'Minnesota', 'Saint Paul'], ['MS', 'Mississippi', 'Jackson'], ['MO', 'Missouri', 'Jefferson City'], ['MT', 'Montana', 'Helena'], ['NE', 'Nebraska', 'Lincoln'], ['NV', 'Nevada', 'Carson City'], ['NH', 'New Hampshire', 'Concord'], ['NJ', 'New Jersey', 'Trenton'], ['NM', 'New Mexico', 'Santa Fe'], ['NY', 'New York', 'Albany'], ['NC', 'North Carolina', 'Raleigh'], ['ND', 'North Dakota', 'Bismarck'], ['OH', 'Ohio', 'Columbus'], ['OK', 'Oklahoma', 'Oklahoma City'], ['OR', 'Oregon', 'Salem'], ['PA', 'Pennsylvania', 'Harrisburg'], ['RI', 'Rhode Island', 'Providence'], ['SC', 'South Carolina', 'Columbia'], ['SD', 'South Dakota', 'Pierre'], ['TN', 'Tennessee', 'Nashville'], ['TX', 'Texas', 'Austin'], ['UT', 'Utah', 'Salt Lake City'], ['VT', 'Vermont', 'Montpelier'], ['VA', 'Virginia', 'Richmond'], ['WA', 'Washington', 'Olympia'], ['WV', 'West Virginia', 'Charleston'], ['WI', 'Wisconsin', 'Madison'], ['WY', 'Wyoming', 'Cheyenne']];
  var POS = { AK: [0, 0], ME: [10, 0], WI: [5, 1], MI: [7, 1], VT: [9, 1], NH: [10, 1], WA: [0, 2], ID: [1, 2], MT: [2, 2], ND: [3, 2], MN: [4, 2], IL: [5, 2], IN: [6, 2], OH: [7, 2], PA: [8, 2], NY: [9, 2], MA: [10, 2], OR: [0, 3], NV: [1, 3], WY: [2, 3], SD: [3, 3], IA: [4, 3], MO: [5, 3], KY: [6, 3], WV: [7, 3], NJ: [9, 3], CT: [10, 3], RI: [11, 3], CA: [0, 4], UT: [1, 4], CO: [2, 4], NE: [3, 4], KS: [4, 4], AR: [5, 4], TN: [6, 4], NC: [7, 4], VA: [8, 4], MD: [9, 4], DE: [10, 4], AZ: [1, 5], NM: [2, 5], TX: [3, 5], OK: [4, 5], LA: [5, 5], MS: [6, 5], AL: [7, 5], GA: [8, 5], SC: [9, 5], HI: [0, 6], FL: [9, 6] };
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
          stage.appendChild(h('div', 'ksub', 'Tap it on the map. Each tile is a state.'));
          var map = h('div', 'kmap'); map.style.gridTemplateColumns = 'repeat(12,1fr)';
          var btns = {}, locked = false, r, c;
          for (r = 0; r < 7; r++) for (c = 0; c < 12; c++) {
            var code = null; for (var k in POS) if (POS[k][0] === c && POS[k][1] === r) code = k;
            if (!code) { map.appendChild(h('i')); continue; }
            (function (code) {
              var b = h('button', '', code); b.type = 'button'; b.setAttribute('aria-label', code);
              b.addEventListener('click', function () {
                if (locked) return; locked = true;
                if (code === s[0]) { b.classList.add('right'); done(true, 'YES! THAT IS ' + s[1].toUpperCase() + '.'); }
                else { b.classList.add('wrong'); btns[s[0]].classList.add('right'); var w = S.filter(function (x) { return x[0] === code; })[0]; done(false, 'THAT IS ' + w[1].toUpperCase() + '. ' + s[1].toUpperCase() + ' IS THE GREEN ONE.'); }
              });
              map.appendChild(b); btns[code] = b;
            })(code);
          }
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
