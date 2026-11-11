export function validate(schemas) {
  return (req, res, next) => {
    req.valid = {};
    for (const key of ['params', 'query', 'body']) {
      if (schemas[key]) req.valid[key] = schemas[key].parse(req[key] ?? {});
    }
    next();
  };
}