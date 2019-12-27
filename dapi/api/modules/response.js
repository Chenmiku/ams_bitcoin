var errorMessage = {
    message: String,
    success: Boolean,
  };

exports.errorResponse = function(err, res, statusCode) {
    errorMessage.message = err
    errorMessage.success = false
    res.status(statusCode).json(errorMessage);
}