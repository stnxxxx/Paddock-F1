const { Client } = require("ssh2")
const fs = require("fs")
const path = require("path")

const pubKey = fs.readFileSync(path.join(process.env.USERPROFILE, ".ssh", "id_ed25519_vps.pub"), "utf8").trim()

const conn = new Client()
conn.on("ready", () => {
  console.log("Connected to VPS")
  // Use base64 to safely transfer the key
  const b64 = Buffer.from(pubKey + "\n").toString("base64")
  conn.exec(`mkdir -p ~/.ssh && echo ${b64} | base64 -d >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && chmod 700 ~/.ssh`, (err, stream) => {
    if (err) { console.error("Error:", err.message); conn.end(); return }
    let out = ""
    stream.on("data", (d) => { out += d.toString() })
    stream.stderr.on("data", (d) => { console.error("STDERR:", d.toString()) })
    stream.on("close", (code) => {
      console.log("Exit code:", code, out)
      conn.end()
    })
  })
})
conn.on("error", (e) => console.error("Error:", e.message))
conn.connect({ host: "185.240.103.224", username: "root", password: "GoamyB8S50Qs2Fh89U", readyTimeout: 10000 })