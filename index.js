const fs = require('fs')
const express = require('express')
const { createLogger, format, transports } = require('winston')

const APPNAME = 'ip-dir'
const FILEPATH = 'records.json'
const FIELDS = ['ip', 'name', 'description']
const PORT = 3000

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.errors({ stack: true }),
    format.timestamp(),
    format.splat(),
    format.json(),
  ),
  transports: [
    new transports.File({
      filename: `${APPNAME}.log`
    }),
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(
          ({ level, message, timestamp }) => `${timestamp} ${level}: ${message}`
        ),
      )
    })
  ]
})

fs.exists(FILEPATH, (exists) => {
  if (!exists) {
    fs.writeFile(FILEPATH, JSON.stringify([]), () => {
      logger.info(`Writing new file: ${FILEPATH}`)
    })
  }
})

const app = express()
app.use(express.urlencoded({ extended: true }))

app.get('/', (req, res) => {
  fs.readFile(FILEPATH, (err, data) => {
    if (err) {
      logger.error(`Error reading file:\n${err}`)
    }
    res
      .set('Content-Type', 'text/html')
      .status(200)
      .send(`
<!DOCTYPE html>
<html>
   <head>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
      <title>${APPNAME}</title>
      <style>
        body {
          font-family: monospace;
        }
        input {
          margin-right: 2em;
        }
        table {
          margin-top: 2em;
        }
        th {
          padding-bottom: 0.5em;
        }
        th, td {
          padding-right: 2em;
        }
      </style>
   </head>
   <body>
        <div>
            <form action="/" method="POST">
                ${FIELDS.map(
                  (field) => `${field}:<input type="text" name="${field}">`).join('')
                }
                <input type="submit" value="Append">
            </form>
            <table>
                <tr>
                    ${FIELDS.map(
                      (field) => `<th align="left">${field}</th>`).join('')
                    }
                </tr>
                ${JSON.parse(data).map(
                  (record) => `<tr>${FIELDS.map(
                    (field) => `<td>${record[field]}</td>`).join('')
                  }</tr>`).join('\n')}
            </table>
        </div>
        <script type="text/javascript">
        </script>
    </body>
</html>
`)})})

app.post('/', (req, res) => {
  const record = Object.assign({}, ...FIELDS.map((field) => ({[field]: req.body[field]})))
  fs.readFile(FILEPATH, (err, data) => {
    var records = JSON.parse(data)
    logger.info(`Appending new record:\n\t${JSON.stringify(record)}`)
    records.push(record)
    fs.writeFile(FILEPATH, JSON.stringify(records), (err) => {
      if (err) {
        logger.error(`Error writing file:\n${err}`)
      }
      res.redirect('back')
    })
  })
})

app.listen(PORT, () => {
  logger.info(`${APPNAME} listening on port ${PORT}!`)
})
