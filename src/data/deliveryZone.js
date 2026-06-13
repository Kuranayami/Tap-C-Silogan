export const DELIVERY_FEE = 40

function isInsidePolygon(lat, lng, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const pi = poly[i], pj = poly[j];
    if ((pi.lat > lat) !== (pj.lat > lat) &&
        lng < ((pj.lng - pi.lng) * (lat - pi.lat)) / (pj.lat - pi.lat) + pi.lng) {
      inside = !inside;
    }
  }
  return inside;
}

const DELIVERY_AREA = [
  // E. Abello (NW bulge -> NE junction)
  {lat:14.622264,lng:121.078831},
  {lat:14.622345,lng:121.078837},
  {lat:14.622414,lng:121.078865},
  {lat:14.622545,lng:121.079011},
  {lat:14.622618,lng:121.079103},
  {lat:14.622656,lng:121.079153},
  {lat:14.622838,lng:121.079385},
  {lat:14.623169,lng:121.079808},
  {lat:14.623342,lng:121.079996},
  {lat:14.623488,lng:121.080230},
  {lat:14.623544,lng:121.080238},
  {lat:14.623634,lng:121.080218},
  {lat:14.623886,lng:121.080611},
  {lat:14.624163,lng:121.081094},

  // Kap. Enchong Rivera (N -> S)
  {lat:14.623967,lng:121.081093},
  {lat:14.623551,lng:121.081085},
  {lat:14.623225,lng:121.081086},
  {lat:14.622899,lng:121.081072},
  {lat:14.622606,lng:121.081043},
  {lat:14.622396,lng:121.081027},
  {lat:14.622338,lng:121.081003},
  {lat:14.622314,lng:121.080966},
  {lat:14.622296,lng:121.080910},
  {lat:14.622275,lng:121.080799},

  // O. de Guzman (junction -> intersection -> SW end)
  {lat:14.622071,lng:121.080422},
  {lat:14.621843,lng:121.080161},
  {lat:14.621704,lng:121.080025},
  {lat:14.621571,lng:121.079885},
  {lat:14.621413,lng:121.079727},
  {lat:14.621246,lng:121.079598},
  {lat:14.621090,lng:121.079466},
  {lat:14.620940,lng:121.079351},
  {lat:14.620766,lng:121.079226},
  {lat:14.620612,lng:121.079110},
  {lat:14.620461,lng:121.078982},
  {lat:14.620383,lng:121.078931},
  {lat:14.620306,lng:121.078880},
  {lat:14.620221,lng:121.078819},
  {lat:14.620183,lng:121.078790},
  {lat:14.620013,lng:121.078672},
  {lat:14.619852,lng:121.078546},
  {lat:14.619687,lng:121.078432},
  {lat:14.619625,lng:121.078390},
  {lat:14.619541,lng:121.078351},
  {lat:14.619284,lng:121.078243},
  {lat:14.619205,lng:121.078210},
  {lat:14.618874,lng:121.078059},
  {lat:14.618688,lng:121.077957},
  {lat:14.618616,lng:121.077915},
  {lat:14.618604,lng:121.077898},
  {lat:14.618604,lng:121.077879},

  // Western boundary (SW end -> E. Abello NW bulge)
  {lat:14.61900,lng:121.07750},
  {lat:14.61980,lng:121.07760},
  {lat:14.62060,lng:121.07780},
  {lat:14.62120,lng:121.07790},
  {lat:14.62180,lng:121.07810},
  {lat:14.62226,lng:121.07850},
  {lat:14.622264,lng:121.078831},
];

export function isInDeliveryZone(lat, lng) {
  return isInsidePolygon(lat, lng, DELIVERY_AREA);
}
