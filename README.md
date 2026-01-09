# CBOR Test Vectors

Test vectors for [CBOR](https://datatracker.ietf.org/wg/cbor/documents/).  See
[RFC 8949](https://www.rfc-editor.org/rfc/rfc8949) for a starting point.

## Intent

Ensure full coverage of a typical CBOR implementation, including failing in
all of the correct places.  Different libraries may make different choices, or
have configurable options to act in different modes.

## Format

Multiple JSON files in the tests directory.  Each file is [EDN](https://www.ietf.org/archive/id/draft-ietf-cbor-edn-literals-19.html) of the form:

```cbor-edn
{
  "title": "mt0-good",
  "description": "Plain CBOR integers storable as major type 0 (mt0), from RFC 8949 appendix A",
  "fail": false,
  "tests": [
    {
      "description": "mt0 zero",
      "encoded": h'00',
      "decoded": 0,
    },
  ],
}
```
