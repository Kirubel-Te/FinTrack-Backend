export function validate(schema) {
    return async function validateRequest(req, _res, next) {
        try {
            const parsed = await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params
            });

            req.validated = parsed;

            if (parsed.body !== undefined) {
                req.body = parsed.body;
            }

            if (parsed.params !== undefined) {
                req.params = parsed.params;
            }

            return next();
        } catch (error) {
            return next(error);
        }
    };
}
