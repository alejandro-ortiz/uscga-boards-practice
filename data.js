window.STUDY_DATA = {
  helm: [
    ['RIGHT/LEFT STANDARD/FULL RUDDER', 'Apply the ordered rudder. Standard rudder is the amount required to turn the ship on its standard tactical diameter, normally 20 degrees. Full rudder is the amount required to steer on a reduced tactical diameter, normally 30 degrees. The rudder angle can vary from ship to ship.'],
    ['RIGHT/LEFT ### DEGREES RUDDER', 'Apply the ordered rudder. The Conn can follow this order with a new course for the Helmsman to steer, such as "STEADY ON COURSE 256" or another rudder command. If the Conn does not specify a course, the Helmsmen must call out the heading at 10-degree increments, such as "PASSING TO THE RIGHT 150, PASSING TO THE RIGHT 160" until the Conn orders a course.'],
    ['EASE YOUR RUDDER', 'Decrease the rudder angle by half the amount currently applied or by the amount ordered. The Conn can follow this order with a new course for the Helmsman to steer or another rudder command. If the Conn does not specify a course, the Helmsman must call out the heading at 10-degree increments until the Conn orders a course.'],
    ['EASE YOUR RUDDER TO RIGHT/LEFT ## DEGREES', 'Decrease the rudder angle by half the amount currently applied or by the amount ordered. The Conn can follow this order with a new course for the Helmsman to steer or another rudder command. If the Conn does not specify a course, the Helmsman must call out the heading at 10-degree increments until the Conn orders a course.'],
    ['RUDDER AMIDSHIPS', 'Place the rudder at zero degrees.'],
    ['MEET HER', 'Use the rudder as necessary to check the swing of the ship without steadying on any specific course.'],
    ['STEADY / STEADY AS SHE GOES', 'Steer the course on which the ship is currently headed or the ordered course. If the ship is turning and the Conn gives the command STEADY or STEADY AS SHE GOES, the Helmsman notes the heading and responds "MARK, ###," calling the heading of the ship at that point. The Helmsman then steers the ship to that heading and calls "STEADY ON COURSE ###," when the heading has been reached.'],
    ['STEADY ON COURSE ###', 'Steer the course on which the ship is currently headed or the ordered course.'],
    ['STEER ON', 'The Helmsman steers on a range or object identified by the Conning Officer.'],
    ['SHIFT YOUR RUDDER', 'Move the rudder to the same angle in the opposite direction from where it is currently ordered. The Conn can only give this order when a specific rudder angle is in effect.'],
    ['NOTHING TO THE RIGHT/LEFT OF COURSE ###', 'Steer nothing to the right/left of the course specified.'],
    ["HOW'S YOUR RUDDER", 'This is a query from the Conn to ascertain the current ridder placement. The Helmsman replies, "MY RUDDER IS RIGHT/LEFT ### DEGREES."'],
    ['MARK YOUR HEAD', 'A command given to the Helmsman to state the heading of the ship at the moment the command was given. The Helmsman responds, "MARK ###."'],
    ['COMMAND', 'The Helmsman\'s response to the Conn if they did not hear a command, misunderstood a command, or believes a command is improper.'],
    ['SALLY YOUR RUDDER', 'Shifting back and forth between a set number of degrees of right and left rudder as ordered by the OOD.'],
    ['MIND YOUR HELM', 'A command from the Conn, CO, OOD (if separate), or the Navigator to the Helmsman to pay closer attention to their steering.']
  ].map((item, index) => ({ id: `helm-${index}`, command: item[0], meaning: item[1] })),
  lines: [
    ['PUT OVER', 'Pass the specified line to the pier and provide enough slack to allow line handlers the place the line over the bit, cleat, or bollard.'],
    ['HOLD', 'Do not let any more line out even though the risk of parting may exist.'],
    ['CHECK', 'Hold heavy tension on the specified line but render it as necessary to prevent parting the line.'],
    ['SURGE', 'Hold moderate tension on a line but render it enough to permit movement of the ship.'],
    ['EASE', 'Let a line out until it is under less tension, but not slacked.'],
    ['SLACK', 'Take all tension off a line.'],
    ['TAKE SLACK OUT OF', 'Take all slack out of a line, but so not take strain.'],
    ['SHIFT', 'Move a line to the specified location.'],
    ['HEAVE AROUND ON', 'Take a strain on a line.'],
    ['SINGLE UP', 'Take in all but one bight so there remains a single part to the line. Can also be used to single up all normal mooring lines.'],
    ['DOUBLE UP', 'Pass an additional bight on the specified line so there are three parts on the line. This can also be used to double up all normal mooring lines. Cutters without sufficient mooring line for three parts should just pass the bitter end of the single up to the peer.'],
    ["CAST OFF", "When using another ship's lines to secure your ship, it means to cast off the ends of their lines."],
    ['TAKE IN', 'Allow the pier line handler enough slack to take the line off the fitting and bring the line aboard. Used when secured with your own line.'],
    ['STAND BY YOUR LINES', 'Man the lines, ready to cast off or moor.'],
    ['UP-BEHIND', 'Cease hauling on the line and slack it quickly.']
  ].map((item, index) => ({ id: `line-${index}`, command: item[0], meaning: item[1] }))
};