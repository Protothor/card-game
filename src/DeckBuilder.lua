value = ""
count = 0

function split (inputstr, sep)
    local t={}
    for str in string.gmatch(inputstr, "([^"..sep.."]+)") do
        table.insert(t, str)
    end
    return t
end

function input(_, _, v)
    value = v
end

function makeDeck()
    local card_list = split(value, ",")
    for _, splitIt in ipairs(card_list) do
        local id_num = split(splitIt, ":")
        local id = tonumber(id_num[1])
        local num = tonumber(id_num[2])
        function clone_it(card)
            for i = num, 1, -1 do
                card.clone({
                    position=card.getPosition() + Vector(0,1,0)
                })
            end
            card.destruct()
        end
        local card = self.takeObject({
            index = id - count,
            callback_function=clone_it,
            top = false,
            smooth = false,
        })
        count = count + 1
    end
end

function onLoad()
    self.createInput({
        input_function = "input",
        function_owner = self,
        label          = "Deck Input",
        -- alignment      = 4,
        position       = {0,0.5,0},
        rotation       = {0,0,0},
        width          = 800,
        height         = 300,
        font_size      = 100,
        -- validation     = 2,
    })
    self.createButton({
        click_function = "makeDeck",
        function_owner = self,
        label          = "Make Deck",
        position       = {2, 0.5, 0},
        rotation       = {0, 0, 0},
        width          = 800,
        height         = 400,
        font_size      = 100,
        color          = {0.5, 0.5, 0.5},
        font_color     = {1, 1, 1},
    })
end