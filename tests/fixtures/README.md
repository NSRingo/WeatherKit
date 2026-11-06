# WK3 synthetic fixture

`wk3-aq.synthetic.bin` uses the independent AQ encoder at WeatherKit PR #108 commit `a1defe6465ca5098bfce32d1574c1e2ddf2af4e2`. It contains AQ at root 0 and opaque table products at roots 1, 2, 3, 4, 5, 9, 14, and 17. All values are synthetic; this is not an official Apple capture.

The tests assert literal wire values and preservation of the complete original arena. Non-AQ products are deliberately opaque and must not be interpreted as supported WK3 weather products.
