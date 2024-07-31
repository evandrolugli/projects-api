const express = require("express")
const app = express();

app.use(express.json());

app.get('/', function(req, res){
    res.send("Hello Get")
})

const PORT = 3000
app.listen(PORT, ()=> {
    console.log(`Server running on http://localhost:${PORT}`)
})
