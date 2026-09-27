const { Hand } = require('pokersolver')
try {
  console.log(Hand.solve(['As', 'Ks']).name)
} catch (e) {
  console.log("Error 2 cards:", e.message)
}
try {
  console.log(Hand.solve(['As', 'Ks', '2d', '3d', '4c']).name)
} catch (e) {
  console.log("Error 5 cards:", e.message)
}
