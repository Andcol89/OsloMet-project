query MyQuery {
  studenterGittFeideBrukere(
    eierOrganisasjonskode: "215"
    feideBrukere: "s300055@oslomet.no"
  ) {
    id
    personProfil {
      navn {
        fornavn
        etternavn
      }
      privatEpost
    }
  }
}

response example

{
  "data": {
    "studenterGittFeideBrukere": [
      {
        "id": "OTk6MjE1LDY0OTM0Ng",
        "personProfil": {
          "navn": {
            "fornavn": "TestbrukerUTD",
            "etternavn": "TestbrukerUTD"
          },
          "privatEpost": "canvas-stu@oslomet.no"
        }
      }
    ]
  }
}